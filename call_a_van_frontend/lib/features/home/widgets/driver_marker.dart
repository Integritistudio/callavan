import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../../core/map_marker_scale.dart';
import 'radar_animation_marker.dart';

class DriverMarker extends Marker {
  DriverMarker({
    required Map<String, dynamic> driver,
    required VoidCallback onTap,
    bool isOrange = false,
  }) : super(
          width: 100.0, // Room for live radar rings + 15% larger live icon
          height: 100.0,
          point: LatLng(
            double.tryParse(driver['latitude']?.toString() ?? '') ?? 0.0,
            double.tryParse(driver['longitude']?.toString() ?? '') ?? 0.0,
          ),
          child: GestureDetector(
            onTap: onTap,
            child: (driver['isLive'] == true ||
                    driver['isLive'] == 1 ||
                    driver['isLive'] == 'true')
                ? LiveRadarMarker(isOrange: isOrange)
                : Center(
                    child: Container(
                      width: offlineVanIconSize,
                      height: offlineVanIconSize,
                      decoration: BoxDecoration(
                        color: Colors.grey.shade500,
                        shape: BoxShape.circle,
                        boxShadow: const [
                          BoxShadow(
                            color: Colors.black26,
                            blurRadius: 4,
                            offset: Offset(0, 2),
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.airport_shuttle_rounded,
                        color: Colors.white,
                        size: offlineVanSvgSize,
                      ),
                    ),
                  ),
          ),
        );
}
