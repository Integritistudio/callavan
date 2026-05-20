import 'package:flutter/material.dart';
import '../../../core/app_colors.dart';
import 'driver_login_modal.dart';
import 'driver_signup_modal.dart';

class DriverBottomBar extends StatelessWidget {
  final String? jwtToken;
  final bool isDriverLive;
  final Function(String, Map<String, dynamic>) onLoginSuccess;
  final Function(String) onPendingApproval;
  final Function(String, {bool isError}) showNotification;
  final Function(bool) onToggleLiveStatus;

  const DriverBottomBar({
    super.key,
    required this.jwtToken,
    required this.isDriverLive,
    required this.onLoginSuccess,
    required this.onPendingApproval,
    required this.showNotification,
    required this.onToggleLiveStatus,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      color: AppColors.primaryBlue,
      child: jwtToken == null
          ? Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () {
                      showDialog(
                        context: context,
                        builder: (context) => DriverSignupModal(
                          showNotification: showNotification,
                        ),
                      );
                    },
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Colors.white),
                    ),
                    child: const Text(
                      "Become a Driver",
                      style: TextStyle(color: Colors.white),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {
                      showDialog(
                        context: context,
                        builder: (context) => DriverLoginModal(
                          isDriverLive: isDriverLive,
                          onLoginSuccess: onLoginSuccess,
                          onPendingApproval: onPendingApproval,
                          onSignUpPressed: () {
                            showDialog(
                              context: context,
                              builder: (context) => DriverSignupModal(
                                showNotification: showNotification,
                              ),
                            );
                          },
                          showNotification: showNotification,
                        ),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.successGreen,
                    ),
                    child: const Text(
                      "Log In / Go Live",
                      style: TextStyle(color: Colors.white),
                    ),
                  ),
                ),
              ],
            )
          : Center(
              child: SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: () => onToggleLiveStatus(!isDriverLive),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: isDriverLive
                        ? Colors.redAccent
                        : AppColors.successGreen,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: Text(
                    isDriverLive ? "Go Offline" : "Go Live",
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                ),
              ),
            ),
    );
  }
}
