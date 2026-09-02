#ifdef __ANDROID__

#include "SoundEngine.h"

#include <android/asset_manager.h>
#include <android/log.h>
#include <aaudio/AAudio.h>
#include <media/NdkMediaExtractor.h>
#include <media/NdkMediaCodec.h>
#include <media/NdkMediaFormat.h>

#include <string>
#include <vector>
#include <unordered_map>
#include <mutex>
#include <thread>
#include <cstring>
#include <cstdint>

#define TAG "SoundEngine"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO,  TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, TAG, __VA_ARGS__)

extern AAssetManager *gAssetManager;

// SoundEngine keeps its own reference so it doesn't depend on OpeningBook internals
static AAssetManager *gSoundAssetManager = nullptr;

extern "C" void setSoundAssetManager(AAssetManager *mgr) {
    gSoundAssetManager = mgr;
}

struct PcmBuffer {
    std::vector<int16_t> samples; 
    int32_t sampleRate  = 44100;
    int32_t channelCount = 2;
};

static std::unordered_map<std::string, PcmBuffer> gBuffers;
static std::mutex gMutex;
static bool gInitialised = false;

static const std::unordered_map<std::string, std::string> kAssets = {
    {"move",     "move.mp3"},
    {"capture",  "capture.mp3"},
    {"check",    "check.mp3"},
    {"castle",   "castle.mp3"},
    {"game_end", "game_end.mp3"},
    {"victory",  "victory.mp3"},
};

static bool decodeAsset(const std::string &assetName, PcmBuffer &out) {
    if (!gSoundAssetManager) { LOGE("No AAssetManager"); return false; }

    AAsset *asset = AAssetManager_open(
        gSoundAssetManager, assetName.c_str(), AASSET_MODE_BUFFER);
    if (!asset) { LOGE("Cannot open asset: %s", assetName.c_str()); return false; }

    off64_t outStart = 0, outLen = 0;
    int assetFd = AAsset_openFileDescriptor64(asset, &outStart, &outLen);
    AAsset_close(asset);

    if (assetFd < 0) { LOGE("openFileDescriptor64 failed for %s", assetName.c_str()); return false; }

    AMediaExtractor *ex = AMediaExtractor_new();
    media_status_t st = AMediaExtractor_setDataSourceFd(ex, assetFd, outStart, outLen);
    close(assetFd);

    if (st != AMEDIA_OK) {
        LOGE("setDataSourceFd failed: %d for %s", (int)st, assetName.c_str());
        AMediaExtractor_delete(ex);
        return false;
    }

    int audioTrack = -1;
    AMediaFormat *fmt = nullptr;
    for (size_t i = 0; i < AMediaExtractor_getTrackCount(ex); i++) {
        AMediaFormat *tf = AMediaExtractor_getTrackFormat(ex, i);
        const char *mime = nullptr;
        AMediaFormat_getString(tf, AMEDIAFORMAT_KEY_MIME, &mime);
        if (mime && strncmp(mime, "audio/", 6) == 0) {
            audioTrack = (int)i;
            fmt = tf;
            break;
        }
        AMediaFormat_delete(tf);
    }

    if (audioTrack < 0) {
        LOGE("No audio track in %s", assetName.c_str());
        AMediaExtractor_delete(ex);
        return false;
    }

    AMediaExtractor_selectTrack(ex, audioTrack);

    int32_t sampleRate = 44100, channelCount = 2;
    AMediaFormat_getInt32(fmt, AMEDIAFORMAT_KEY_SAMPLE_RATE, &sampleRate);
    AMediaFormat_getInt32(fmt, AMEDIAFORMAT_KEY_CHANNEL_COUNT, &channelCount);

    const char *mime = nullptr;
    AMediaFormat_getString(fmt, AMEDIAFORMAT_KEY_MIME, &mime);

    AMediaCodec *codec = AMediaCodec_createDecoderByType(mime);
    if (!codec) {
        LOGE("Cannot create decoder for %s", mime);
        AMediaFormat_delete(fmt);
        AMediaExtractor_delete(ex);
        return false;
    }

    AMediaCodec_configure(codec, fmt, nullptr, nullptr, 0);
    AMediaCodec_start(codec);
    AMediaFormat_delete(fmt);

    std::vector<int16_t> pcm;
    bool inputDone = false;
    bool outputDone = false;
    const int64_t kTimeoutUs = 5000; // 5ms

    while (!outputDone) {
        if (!inputDone) {
            ssize_t inIdx = AMediaCodec_dequeueInputBuffer(codec, kTimeoutUs);
            if (inIdx >= 0) {
                size_t bufSz = 0;
                uint8_t *buf = AMediaCodec_getInputBuffer(codec, inIdx, &bufSz);
                ssize_t sampSz = AMediaExtractor_readSampleData(ex, buf, bufSz);
                if (sampSz < 0) {
                    AMediaCodec_queueInputBuffer(codec, inIdx, 0, 0, 0,
                        AMEDIACODEC_BUFFER_FLAG_END_OF_STREAM);
                    inputDone = true;
                } else {
                    int64_t pts = AMediaExtractor_getSampleTime(ex);
                    AMediaCodec_queueInputBuffer(codec, inIdx, 0, sampSz, pts, 0);
                    AMediaExtractor_advance(ex);
                }
            }
        }

        AMediaCodecBufferInfo info;
        ssize_t outIdx = AMediaCodec_dequeueOutputBuffer(codec, &info, kTimeoutUs);
        if (outIdx >= 0) {
            size_t outSz = 0;
            uint8_t *outBuf = AMediaCodec_getOutputBuffer(codec, outIdx, &outSz);
            if (outBuf && info.size > 0) {
                size_t numSamples = info.size / sizeof(int16_t);
                int16_t *s = reinterpret_cast<int16_t *>(outBuf);
                pcm.insert(pcm.end(), s, s + numSamples);
            }
            AMediaCodec_releaseOutputBuffer(codec, outIdx, false);
            if (info.flags & AMEDIACODEC_BUFFER_FLAG_END_OF_STREAM) {
                outputDone = true;
            }
        }
    }

    AMediaCodec_stop(codec);
    AMediaCodec_delete(codec);
    AMediaExtractor_delete(ex);

    out.samples      = std::move(pcm);
    out.sampleRate   = sampleRate;
    out.channelCount = channelCount;
    LOGI("Decoded %s → %zu samples @%dHz ch%d",
         assetName.c_str(), out.samples.size(), sampleRate, channelCount);
    return true;
}

static void playBuffer(const PcmBuffer &buf) {
    if (buf.samples.empty()) return;

    auto samples      = std::make_shared<std::vector<int16_t>>(buf.samples);
    int32_t sr        = buf.sampleRate;
    int32_t channels  = buf.channelCount;

    std::thread([samples, sr, channels]() {
        AAudioStreamBuilder *builder = nullptr;
        AAudio_createStreamBuilder(&builder);
        AAudioStreamBuilder_setFormat(builder, AAUDIO_FORMAT_PCM_I16);
        AAudioStreamBuilder_setSampleRate(builder, sr);
        AAudioStreamBuilder_setChannelCount(builder, channels);
        AAudioStreamBuilder_setPerformanceMode(builder, AAUDIO_PERFORMANCE_MODE_LOW_LATENCY);
        AAudioStreamBuilder_setSharingMode(builder, AAUDIO_SHARING_MODE_SHARED);

        AAudioStream *stream = nullptr;
        aaudio_result_t res = AAudioStreamBuilder_openStream(builder, &stream);
        AAudioStreamBuilder_delete(builder);

        if (res != AAUDIO_OK || !stream) {
            LOGE("AAudio openStream failed: %s", AAudio_convertResultToText(res));
            return;
        }

        AAudioStream_requestStart(stream);

        const int16_t *ptr = samples->data();
        int32_t remaining  = (int32_t)(samples->size() / channels); // frames

        while (remaining > 0) {
            int32_t toWrite = std::min(remaining, 1024);
            int32_t written = AAudioStream_write(stream, ptr, toWrite, 100000000LL);
            if (written < 0) break;
            ptr       += written * channels;
            remaining -= written;
        }

        AAudioStream_requestStop(stream);
        AAudioStream_close(stream);
    }).detach();
}

namespace SoundEngine {

void init() {
    std::lock_guard<std::mutex> lock(gMutex);
    if (gInitialised) return;
    gInitialised = true;

    for (auto &kv : kAssets) {
        PcmBuffer buf;
        if (decodeAsset(kv.second, buf)) {
            gBuffers[kv.first] = std::move(buf);
        }
    }
    LOGI("SoundEngine initialised with %zu sounds", gBuffers.size());
}

void play(const std::string &name) {
    std::lock_guard<std::mutex> lock(gMutex);
    // Lazy init in case init() was called before AAssetManager was ready
    if (!gInitialised && gSoundAssetManager) {
        gInitialised = true;
        for (auto &kv : kAssets) {
            PcmBuffer buf;
            if (decodeAsset(kv.second, buf)) gBuffers[kv.first] = std::move(buf);
        }
    }
    auto it = gBuffers.find(name);
    if (it == gBuffers.end()) return;
    playBuffer(it->second);
}

void release() {
    std::lock_guard<std::mutex> lock(gMutex);
    gBuffers.clear();
    gInitialised = false;
}

} // namespace SoundEngine

#endif // __ANDROID__
