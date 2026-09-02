#ifdef __APPLE__

#import "SoundEngine.h"
#import <Foundation/Foundation.h>
#import <AVFoundation/AVFoundation.h>
#import <mutex>
#import <unordered_map>
#import <string>
#import <vector>

static const int kPoolSize = 3;

@interface SoundPool : NSObject
- (instancetype)initWithURL:(NSURL *)url;
- (void)play;
@end

@implementation SoundPool {
    NSMutableArray<AVAudioPlayer *> *_players;
    NSInteger _cursor;
}

- (instancetype)initWithURL:(NSURL *)url {
    self = [super init];
    if (!self) return nil;
    _players = [NSMutableArray array];
    _cursor = 0;
    for (int i = 0; i < kPoolSize; i++) {
        NSError *err = nil;
        AVAudioPlayer *p = [[AVAudioPlayer alloc] initWithContentsOfURL:url error:&err];
        if (p) {
            [p prepareToPlay];
            [_players addObject:p];
        }
    }
    return self;
}

- (void)play {
    if (_players.count == 0) return;
    AVAudioPlayer *p = _players[_cursor % _players.count];
    _cursor++;
    if (p.isPlaying) [p stop];
    p.currentTime = 0;
    [p play];
}

@end

static std::unordered_map<std::string, SoundPool *> gPools;
static std::mutex gMutex;
static bool gInitialised = false;

static const std::unordered_map<std::string, std::string> kSoundFiles = {
    {"move",     "move"},
    {"capture",  "capture"},
    {"check",    "check"},
    {"castle",   "castle"},
    {"game_end", "game_end"},
    {"victory",  "victory"},
};

namespace SoundEngine {

void init() {
    std::lock_guard<std::mutex> lock(gMutex);
    if (gInitialised) return;
    gInitialised = true;

    AVAudioSession *session = [AVAudioSession sharedInstance];
    [session setCategory:AVAudioSessionCategoryAmbient error:nil];
    [session setActive:YES error:nil];

    for (auto &kv : kSoundFiles) {
        NSURL *url = [[NSBundle mainBundle] URLForResource:@(kv.second.c_str())
                                            withExtension:@"mp3"];
        if (!url) {
            NSLog(@"[SoundEngine] Asset not found: %s.mp3", kv.second.c_str());
            continue;
        }
        SoundPool *pool = [[SoundPool alloc] initWithURL:url];
        gPools[kv.first] = pool;
    }
}

void play(const std::string &name) {
    std::lock_guard<std::mutex> lock(gMutex);
    auto it = gPools.find(name);
    if (it == gPools.end()) return;
    SoundPool *pool = it->second;
    dispatch_async(dispatch_get_main_queue(), ^{
        [pool play];
    });
}

void release() {
    std::lock_guard<std::mutex> lock(gMutex);
    gPools.clear();
    gInitialised = false;
}

} // namespace SoundEngine

#endif // __APPLE__
