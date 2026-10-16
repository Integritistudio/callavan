/// Shared van marker sizing — keep live ~15% larger than offline (matches web).
const double offlineVanIconSize = 38;
const double liveMarkerScaleBoost = 1.15;
const double liveVanIconSize = offlineVanIconSize * liveMarkerScaleBoost; // ~43.7
const double liveVanSvgSize = 22 * liveMarkerScaleBoost;
const double offlineVanSvgSize = 24;
