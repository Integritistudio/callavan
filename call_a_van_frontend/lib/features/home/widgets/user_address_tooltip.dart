import 'package:flutter/material.dart';
import 'clippers.dart';

class UserAddressTooltip extends StatelessWidget {
  final String address;
  final VoidCallback onClose;

  const UserAddressTooltip({
    super.key,
    required this.address,
    required this.onClose,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      alignment: Alignment.bottomCenter,
      children: [
        Positioned(
          bottom: 10,
          child: Container(
            width: 210,
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(8),
              boxShadow: const [
                BoxShadow(
                  color: Colors.black26,
                  blurRadius: 6,
                  offset: Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.location_on,
                  color: Colors.blueAccent,
                  size: 16,
                ),
                const SizedBox(width: 4),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text(
                        "Your Location",
                        style: TextStyle(
                          fontSize: 8,
                          color: Colors.grey,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 1),
                      Text(
                        address,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: Colors.black87,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 2),
                GestureDetector(
                  onTap: onClose,
                  child: const Icon(Icons.close, size: 14, color: Colors.grey),
                ),
              ],
            ),
          ),
        ),
        Positioned(
          bottom: 4,
          child: ClipPath(
            clipper: TriangleClipper(),
            child: Container(
              color: Colors.white,
              width: 12,
              height: 6,
            ),
          ),
        ),
      ],
    );
  }
}
