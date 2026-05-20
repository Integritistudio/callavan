import 'package:flutter/material.dart';

class UserLocationMarkerWidget extends StatelessWidget {
  final VoidCallback onTap;

  const UserLocationMarkerWidget({super.key, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Stack(
        alignment: Alignment.center,
        children: [
          Icon(
            Icons.circle,
            color: Colors.blue.withValues(alpha: 0.2),
            size: 40,
          ),
          const Icon(
            Icons.circle,
            color: Colors.white,
            size: 18,
          ),
          const Icon(
            Icons.circle,
            color: Colors.blue,
            size: 12,
          ),
        ],
      ),
    );
  }
}
