import 'package:flutter/material.dart';
import '../../../core/app_colors.dart';

class StatusCapsule extends StatelessWidget {
  final bool isDriverMode;
  final bool isDriverLive;
  final List<dynamic> onlineDriversList;

  const StatusCapsule({
    super.key,
    required this.isDriverMode,
    required this.isDriverLive,
    required this.onlineDriversList,
  });

  @override
  Widget build(BuildContext context) {
    final int online = onlineDriversList.where((d) =>
        d['isLive'] == true || d['isLive'] == 1 || d['isLive'] == 'true').length;
    final int offline = onlineDriversList.where((d) =>
        d['isLive'] != true && d['isLive'] != 1 && d['isLive'] != 'true').length;

    String labelText;
    if (isDriverMode) {
      if (isDriverLive) {
        labelText = "You are Online & Tracking";
      } else {
        labelText = "${online.toString().padLeft(2, '0')} Online | ${offline.toString().padLeft(2, '0')} Offline";
      }
    } else {
      labelText = "${online.toString().padLeft(2, '0')} Online | ${offline.toString().padLeft(2, '0')} Offline";
    }

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: 16,
        vertical: 8,
      ),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: const [
          BoxShadow(
            color: Colors.black12,
            blurRadius: 8,
            offset: Offset(0, 3),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: (isDriverMode && isDriverLive)
                  ? AppColors.successGreen
                  : Colors.orangeAccent,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 8),
          Text(
            labelText,
            style: const TextStyle(
              color: Colors.black87,
              fontWeight: FontWeight.bold,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}
