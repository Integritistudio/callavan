import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'clippers.dart';

class SelectedDriverPopupMarker extends Marker {
  SelectedDriverPopupMarker({
    required Map<String, dynamic> driver,
    required String? address,
    required MapController mapController,
    required bool isDriverMode,
    required BuildContext context,
    required VoidCallback onClose,
    required Function(String) onCall,
    required String Function(String?) getCorrectImageUrl,
  }) : super(
          point: LatLng(
            double.tryParse(driver['latitude']?.toString() ?? '') ?? 0.0,
            double.tryParse(driver['longitude']?.toString() ?? '') ?? 0.0,
          ),
          width: 260.0,
          height: isDriverMode ? 130.0 : 290.0,
          alignment: _calculateAlignment(driver, mapController, isDriverMode, context),
          child: SelectedDriverPopupCard(
            driver: driver,
            address: address,
            isDriverMode: isDriverMode,
            onClose: onClose,
            onCall: onCall,
            getCorrectImageUrl: getCorrectImageUrl,
            showBelow: _calculateAlignment(driver, mapController, isDriverMode, context).y == -1.0,
          ),
        );

  static Alignment _calculateAlignment(
    Map<String, dynamic> driver,
    MapController mapController,
    bool isDriverMode,
    BuildContext context,
  ) {
    final double? lat = double.tryParse(driver['latitude']?.toString() ?? '');
    final double? lng = double.tryParse(driver['longitude']?.toString() ?? '');

    if (lat == null || lng == null) {
      return Alignment.topCenter;
    }

    double alignX = 0.0;
    double alignY = 1.0; // default alignment (above pin)
    try {
      final Offset screenPoint = mapController.camera.latLngToScreenOffset(LatLng(lat, lng));
      final double screenWidth = MediaQuery.of(context).size.width;

      // 1. Vertical check (card height + indicator + padding)
      final double boundaryHeight = isDriverMode ? 130 : 300;
      if (screenPoint.dy < boundaryHeight) {
        alignY = -1.0; // Show below the pin
      } else {
        alignY = 1.0; // Show above the pin
      }

      // 2. Horizontal check (card width is 260)
      const double halfWidth = 135.0;
      if (screenPoint.dx < halfWidth) {
        alignX = -0.6; // Shift right
      } else if (screenWidth - screenPoint.dx < halfWidth) {
        alignX = 0.6; // Shift left
      }
    } catch (_) {}

    return Alignment(alignX, alignY);
  }
}

class SelectedDriverPopupCard extends StatelessWidget {
  final Map<String, dynamic> driver;
  final String? address;
  final bool isDriverMode;
  final VoidCallback onClose;
  final Function(String) onCall;
  final String Function(String?) getCorrectImageUrl;
  final bool showBelow;

  const SelectedDriverPopupCard({
    super.key,
    required this.driver,
    required this.address,
    required this.isDriverMode,
    required this.onClose,
    required this.onCall,
    required this.getCorrectImageUrl,
    required this.showBelow,
  });

  @override
  Widget build(BuildContext context) {
    // Parse services
    List<String> servicesList = [];
    if (driver['services'] != null) {
      if (driver['services'] is List) {
        servicesList = List<String>.from(driver['services']);
      } else {
        try {
          final parsed = jsonDecode(driver['services'].toString());
          if (parsed is List) {
            servicesList = List<String>.from(parsed);
          }
        } catch (_) {}
      }
    }
    if (servicesList.isEmpty) {
      servicesList = ['General Van Services'];
    }

    // Clean email from display name
    String displayName = driver['fullName'] ?? 'Driver Profile';
    if (displayName.contains('@')) {
      displayName = displayName.split('@').first;
    }

    // Avatar image resolution
    String? profileImgUrl = driver['profileImageUrl'];
    Widget avatarWidget;
    if (profileImgUrl != null && profileImgUrl.isNotEmpty) {
      String finalUrl = getCorrectImageUrl(profileImgUrl);
      avatarWidget = ClipOval(
        child: Image.network(
          finalUrl,
          width: 40,
          height: 40,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stackTrace) {
            return Container(
              width: 40,
              height: 40,
              color: const Color(0xFF2E7D32).withOpacity(0.1),
              child: const Icon(Icons.person, color: Color(0xFF2E7D32), size: 20),
            );
          },
        ),
      );
    } else {
      avatarWidget = Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: const Color(0xFF2E7D32).withOpacity(0.1),
          shape: BoxShape.circle,
        ),
        child: const Icon(Icons.person, color: Color(0xFF2E7D32), size: 20),
      );
    }

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (showBelow) ...[
          const SizedBox(height: 25),
          ClipPath(
            clipper: UpwardTriangleClipper(),
            child: Container(
              color: Colors.white,
              width: 14,
              height: 7,
            ),
          ),
        ],
        // White popup card container
        Container(
          width: 260.0,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            boxShadow: const [
              BoxShadow(
                color: Colors.black26,
                blurRadius: 10,
                spreadRadius: 0.5,
                offset: Offset(0, 3),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top Header Row
              Padding(
                padding: const EdgeInsets.fromLTRB(10, 10, 10, 6),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Row(
                        children: [
                          avatarWidget,
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        displayName,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 13,
                                          color: Colors.black87,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                    const SizedBox(width: 4),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: (driver['isLive'] == true ||
                                                driver['isLive'] == 1 ||
                                                driver['isLive'] == 'true')
                                            ? const Color(0xFFE8F5E9)
                                            : const Color(0xFFEEEEEE),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Text(
                                        (driver['isLive'] == true ||
                                                driver['isLive'] == 1 ||
                                                driver['isLive'] == 'true')
                                            ? "Online"
                                            : "Offline",
                                        style: TextStyle(
                                          color: (driver['isLive'] == true ||
                                                  driver['isLive'] == 1 ||
                                                  driver['isLive'] == 'true')
                                              ? const Color(0xFF2E7D32)
                                              : Colors.grey.shade700,
                                          fontSize: 8,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 1),
                                Text(
                                  driver['companyName'] ?? 'Independent Driver',
                                  style: TextStyle(
                                    fontSize: 10,
                                    color: Colors.grey.shade600,
                                    fontWeight: FontWeight.w500,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 4),
                    GestureDetector(
                      onTap: onClose,
                      child: const CircleAvatar(
                        radius: 10,
                        backgroundColor: Colors.black12,
                        child: Icon(Icons.close, size: 10, color: Colors.black54),
                      ),
                    ),
                  ],
                ),
              ),
              if (isDriverMode) ...[
                // Show simplified vehicle type for driver's peer view
                const Divider(height: 1, thickness: 0.5),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  child: Row(
                    children: [
                      const Icon(Icons.local_shipping, size: 12, color: Colors.blueGrey),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          "Vehicle: ${driver['vehicleType'] ?? 'N/A'}",
                          style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: Colors.black87,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
              ] else ...[
                const Divider(height: 1, thickness: 0.5),
                // Phone & Location Details
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      GestureDetector(
                        onTap: () async {
                          final String num = driver['phoneNumber'] ?? '';
                          if (num.isNotEmpty && num != 'N/A') {
                            await Clipboard.setData(ClipboardData(text: num));
                            // Show standard notification via trigger/scaffold messenger callback if needed
                            // For simplicity, we can fallback to standard feedback or overlay notifications
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text("Phone number copied to clipboard: $num"),
                                duration: const Duration(seconds: 2),
                              ),
                            );
                          }
                        },
                        child: Row(
                          children: [
                            const Icon(Icons.phone, size: 12, color: Colors.blueAccent),
                            const SizedBox(width: 6),
                            Text(
                              driver['phoneNumber'] ?? 'N/A',
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: Colors.black87,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.location_on, size: 12, color: Colors.redAccent),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              address ?? "Loading address...",
                              style: const TextStyle(
                                fontSize: 10,
                                color: Colors.black87,
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const Divider(height: 1, thickness: 0.5),
                // Services Offered List
                Padding(
                  padding: const EdgeInsets.fromLTRB(10, 6, 10, 10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        "Services Offered:",
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: Colors.black54,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Column(
                        children: servicesList.take(3).map((service) {
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 2),
                            child: Row(
                              children: [
                                const Icon(Icons.check_circle, size: 10, color: Color(0xFF2E7D32)),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    service,
                                    style: const TextStyle(fontSize: 10, color: Colors.black87),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                          );
                        }).toList(),
                      ),
                      const SizedBox(height: 8),
                      // Call Button
                      SizedBox(
                        width: double.infinity,
                        height: 34,
                        child: ElevatedButton.icon(
                          onPressed: () {
                            onCall(driver['phoneNumber'] ?? '');
                          },
                          icon: const Icon(Icons.call, color: Colors.white, size: 14),
                          label: const Text(
                            "Call a Driver",
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                            ),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF2E7D32),
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(6),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
        if (!showBelow) ...[
          // Downward triangle indicator pointing to the van
          ClipPath(
            clipper: TriangleClipper(),
            child: Container(
              color: Colors.white,
              width: 14,
              height: 7,
            ),
          ),
          // Small gap to float it cleanly above the van icon
          const SizedBox(height: 25),
        ],
      ],
    );
  }
}
