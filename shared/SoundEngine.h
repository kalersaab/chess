#pragma once
#include <string>

namespace SoundEngine {

void init();

void play(const std::string &name);

void release();

} // namespace SoundEngine
