import 'package:flutter/material.dart';

class LiveRadarMarker extends StatefulWidget {
  final bool isOrange;
  const LiveRadarMarker({super.key, this.isOrange = false});

  @override
  State<LiveRadarMarker> createState() => _LiveRadarMarkerState();
}

class _LiveRadarMarkerState extends State<LiveRadarMarker>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final waveColor = widget.isOrange ? Colors.orangeAccent.withOpacity(0.65) : const Color(0xFF16A34A);
    final iconColor = widget.isOrange ? Colors.orange.shade400 : const Color(0xFF1AB451);

    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        final progress = _controller.value;
        return Stack(
          alignment: Alignment.center,
          children: [
            // Expanding ring 1
            Transform.scale(
              scale: 1.0 + (progress * 2.0), // Sweeps slightly wider
              child: Opacity(
                opacity: (1.0 - progress).clamp(0.0, 1.0),
                child: Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: waveColor.withOpacity(0.9), // Higher border opacity
                      width: 2.0,
                    ),
                    color: waveColor.withOpacity(0.26), // Saturated fill opacity
                  ),
                ),
              ),
            ),
            // Expanding ring 2 (delayed by 0.5)
            Transform.scale(
              scale: 1.0 + (((progress + 0.5) % 1.0) * 2.0), // Sweeps slightly wider
              child: Opacity(
                opacity: (1.0 - ((progress + 0.5) % 1.0)).clamp(0.0, 1.0),
                child: Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: waveColor.withOpacity(0.65), // Higher border opacity
                      width: 1.5,
                    ),
                    color: waveColor.withOpacity(0.18), // Saturated fill opacity
                  ),
                ),
              ),
            ),
            // White circle background with thick green/orange border and matching van icon
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: Colors.white,
                shape: BoxShape.circle,
                border: Border.all(
                  color: iconColor, // Thick border matching the van color
                  width: 2.0,
                ),
                boxShadow: const [
                  BoxShadow(
                    color: Colors.black26,
                    blurRadius: 4,
                    offset: Offset(0, 1),
                  ),
                ],
              ),
              alignment: Alignment.center,
              child: Icon(
                Icons.local_shipping,
                color: iconColor,
                size: 22, // Adjusted size to fit beautifully inside the 2.5px border
              ),
            ),
          ],
        );
      },
    );
  }
}
