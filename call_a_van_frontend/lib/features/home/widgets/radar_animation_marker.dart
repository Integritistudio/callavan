import 'package:flutter/material.dart';

class LiveRadarMarker extends StatefulWidget {
  const LiveRadarMarker({super.key});

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
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        final progress = _controller.value;
        return Stack(
          alignment: Alignment.center,
          children: [
            // Expanding ring 1
            Transform.scale(
              scale: 1.0 + (progress * 1.5),
              child: Opacity(
                opacity: (1.0 - progress).clamp(0.0, 1.0),
                child: Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: Colors.greenAccent.withOpacity(0.6),
                      width: 2.0,
                    ),
                    color: Colors.greenAccent.withOpacity(0.15),
                  ),
                ),
              ),
            ),
            // Expanding ring 2 (delayed by 0.5)
            Transform.scale(
              scale: 1.0 + (((progress + 0.5) % 1.0) * 1.5),
              child: Opacity(
                opacity: (1.0 - ((progress + 0.5) % 1.0)).clamp(0.0, 1.0),
                child: Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: Colors.greenAccent.withOpacity(0.4),
                      width: 1.5,
                    ),
                    color: Colors.greenAccent.withOpacity(0.1),
                  ),
                ),
              ),
            ),
            // Solid inner circle
            const Icon(Icons.circle, color: Colors.white, size: 26),
            const Icon(
              Icons.circle,
              color: Color(0xFF2E7D32), // Vibrant successGreen match
              size: 16,
            ),
          ],
        );
      },
    );
  }
}
