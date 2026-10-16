import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:shimmer/shimmer.dart';

/// Public "View More" driver details — mirrors Next.js DriverProfileDetailsModal.
class DriverPublicDetailsModal extends StatelessWidget {
  final Map<String, dynamic> driver;
  final VoidCallback onClose;
  final void Function(String phone) onCall;
  final String Function(String?) getCorrectImageUrl;

  const DriverPublicDetailsModal({
    super.key,
    required this.driver,
    required this.onClose,
    required this.onCall,
    required this.getCorrectImageUrl,
  });

  static Future<void> show(
    BuildContext context, {
    required Map<String, dynamic> driver,
    required void Function(String phone) onCall,
    required String Function(String?) getCorrectImageUrl,
  }) {
    return showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: 'Close driver details',
      barrierColor: Colors.black.withOpacity(0.6),
      transitionDuration: const Duration(milliseconds: 220),
      pageBuilder: (ctx, anim, secondary) {
        return DriverPublicDetailsModal(
          driver: driver,
          onClose: () => Navigator.of(ctx).pop(),
          onCall: onCall,
          getCorrectImageUrl: getCorrectImageUrl,
        );
      },
      transitionBuilder: (ctx, anim, secondary, child) {
        final curved = CurvedAnimation(parent: anim, curve: Curves.easeOutCubic);
        return FadeTransition(
          opacity: curved,
          child: ScaleTransition(
            scale: Tween<double>(begin: 0.94, end: 1).animate(curved),
            child: child,
          ),
        );
      },
    );
  }

  static List<String> parseServices(Map<String, dynamic> driver) {
    final raw = driver['servicesOffered'] ?? driver['services'];
    if (raw is List) {
      return raw.map((e) => e.toString()).where((s) => s.trim().isNotEmpty).toList();
    }
    if (raw is String) {
      final trimmed = raw.trim();
      if (trimmed.isEmpty) return [];
      try {
        final parsed = jsonDecode(trimmed);
        if (parsed is List) {
          return parsed.map((e) => e.toString()).where((s) => s.trim().isNotEmpty).toList();
        }
      } catch (_) {
        return [trimmed];
      }
    }
    return [];
  }

  bool get _isLive =>
      driver['isLive'] == true || driver['isLive'] == 1 || driver['isLive'] == 'true';

  String get _displayName {
    String name = (driver['fullName'] ?? 'Driver').toString();
    if (name.contains('@')) name = name.split('@').first;
    return name;
  }

  String get _phone {
    final value = driver['mobileNumber'] ?? driver['phoneNumber'] ?? '';
    return value.toString().trim();
  }

  String get _shortBio {
    final value = driver['shortBio'] ?? driver['short_bio'] ?? '';
    return value.toString().trim();
  }

  @override
  Widget build(BuildContext context) {
    final services = parseServices(driver);
    final profileUrl = (driver['profileImageUrl']?.toString().isNotEmpty ?? false)
        ? getCorrectImageUrl(driver['profileImageUrl']?.toString())
        : null;
    final maxWidth = MediaQuery.sizeOf(context).width.clamp(0, 560).toDouble();
    final maxHeight = MediaQuery.sizeOf(context).height * 0.9;

    return Material(
      type: MaterialType.transparency,
      child: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: ConstrainedBox(
              constraints: BoxConstraints(
                maxWidth: maxWidth < 560 ? maxWidth : 560,
                maxHeight: maxHeight,
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Material(
                  color: const Color(0xFFF9FAFB),
                  elevation: 12,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      _buildHeader(profileUrl),
                      Flexible(
                        child: SingleChildScrollView(
                          padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              _buildInfoGrid(context),
                              if (_shortBio.isNotEmpty) ...[
                                const SizedBox(height: 16),
                                _buildBioCard(),
                              ],
                              if (services.isNotEmpty) ...[
                                const SizedBox(height: 16),
                                _buildServicesCard(services),
                              ],
                              if (_phone.isNotEmpty && _phone != 'N/A') ...[
                                const SizedBox(height: 16),
                                SizedBox(
                                  width: double.infinity,
                                  height: 44,
                                  child: ElevatedButton.icon(
                                    onPressed: () => onCall(_phone),
                                    icon: const Icon(Icons.call, color: Colors.white, size: 16),
                                    label: const Text(
                                      'Call a Driver',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 14,
                                      ),
                                    ),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: const Color(0xFF2E7D32),
                                      foregroundColor: Colors.white,
                                      elevation: 0,
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(String? profileUrl) {
    return Container(
      width: double.infinity,
      color: const Color(0xFF0B51C1),
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
      child: Stack(
        alignment: Alignment.topCenter,
        children: [
          SizedBox(
            width: double.infinity,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white,
                    border: Border.all(color: Colors.white, width: 4),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.15),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: profileUrl != null
                      ? CachedNetworkImage(
                          imageUrl: profileUrl,
                          fit: BoxFit.cover,
                          placeholder: (context, url) => Shimmer.fromColors(
                            baseColor: const Color(0xFFE0E0E0),
                            highlightColor: const Color(0xFFF5F5F5),
                            child: Container(color: const Color(0xFFE0E0E0)),
                          ),
                          errorWidget: (context, url, error) => const Icon(
                            Icons.person,
                            size: 36,
                            color: Colors.grey,
                          ),
                        )
                      : const Icon(Icons.person, size: 36, color: Colors.grey),
                ),
                const SizedBox(height: 12),
                Text(
                  _displayName,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 20,
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                  decoration: BoxDecoration(
                    color: _isLive
                        ? const Color(0xFFE8F5E9)
                        : Colors.white.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    _isLive ? 'Online' : 'Offline',
                    style: TextStyle(
                      color: _isLive ? const Color(0xFF2E7D32) : Colors.white.withOpacity(0.9),
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Positioned(
            top: 0,
            right: 0,
            child: IconButton(
              onPressed: onClose,
              icon: const Icon(Icons.close, color: Colors.white, size: 22),
              tooltip: 'Close',
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoGrid(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final useTwoCols = width >= 380;

    final cards = [
      _infoCard(
        icon: Icons.phone,
        label: 'Phone',
        value: _phone.isNotEmpty ? _phone : 'N/A',
      ),
      _infoCard(
        icon: Icons.apartment,
        label: 'Company',
        value: (driver['companyName']?.toString().isNotEmpty ?? false)
            ? driver['companyName'].toString()
            : 'Independent',
      ),
      _infoCard(
        icon: Icons.location_on,
        label: 'Base Area',
        value: (driver['baseArea']?.toString().isNotEmpty ?? false)
            ? driver['baseArea'].toString()
            : 'N/A',
      ),
      _infoCard(
        icon: Icons.local_shipping,
        label: 'Vehicle Type',
        value: (driver['vehicleType']?.toString().isNotEmpty ?? false)
            ? driver['vehicleType'].toString()
            : 'Van',
      ),
    ];

    if (!useTwoCols) {
      return Column(
        children: [
          for (int i = 0; i < cards.length; i++) ...[
            cards[i],
            if (i < cards.length - 1) const SizedBox(height: 12),
          ],
        ],
      );
    }

    return Column(
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: cards[0]),
            const SizedBox(width: 12),
            Expanded(child: cards[1]),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: cards[2]),
            const SizedBox(width: 12),
            Expanded(child: cards[3]),
          ],
        ),
      ],
    );
  }

  Widget _infoCard({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFF3F4F6)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: const BoxDecoration(
              color: Color(0xFFEFF6FF),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: const Color(0xFF2563EB), size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label.toUpperCase(),
                  style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF9CA3AF),
                    letterSpacing: 0.6,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF1F2937),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBioCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFF3F4F6)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.only(top: 2),
            child: Icon(Icons.notes, color: Color(0xFF2563EB), size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'SHORT BIO',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF9CA3AF),
                    letterSpacing: 0.6,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _shortBio,
                  style: const TextStyle(
                    fontSize: 14,
                    height: 1.45,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF4B5563),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildServicesCard(List<String> services) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFF3F4F6)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.settings, color: Color(0xFF2563EB), size: 18),
              SizedBox(width: 8),
              Text(
                'SERVICES OFFERED',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF9CA3AF),
                  letterSpacing: 0.6,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: services.map((s) {
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(color: const Color(0xFFDBEAFE)),
                ),
                child: Text(
                  s,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF1D4ED8),
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}
