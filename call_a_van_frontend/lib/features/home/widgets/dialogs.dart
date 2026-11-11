import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import '../../../core/app_colors.dart';
import '../../../core/brand.dart';

class HomeDialogs {
  static Future<bool> showLocationPermissionExplanation(
    BuildContext context, {
    required bool isHardwareDisabled,
    required bool isDriver,
  }) async {
    final result = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => _LocationConsentDialog(
        isHardwareDisabled: isHardwareDisabled,
        isDriver: isDriver,
      ),
    );
    return result ?? false;
  }

  static Future<void> showPrivacyPolicy(BuildContext context) {
    return showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text(
          "Privacy Policy",
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        content: SizedBox(
          width: double.maxFinite,
          child: SingleChildScrollView(
            child: Text(
              _privacyPolicyText,
              style: const TextStyle(
                fontSize: 13,
                height: 1.45,
                color: Colors.black87,
              ),
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text(
              "Close",
              style: TextStyle(
                color: AppColors.primaryBlue,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  static void showApprovalGuidance(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.hourglass_empty, color: Colors.orange, size: 24),
            SizedBox(width: 10),
            Text(
              "Pending Approval",
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
            ),
          ],
        ),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              "Your driver registration request is safely logged!",
              style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
            ),
            SizedBox(height: 12),
            Text(
              "Once approved by the administrator, you will be able to log in and go live instantly.",
              style: TextStyle(color: Colors.grey, fontSize: 12),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text(
              "Got It",
              style: TextStyle(
                color: AppColors.primaryBlue,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  static void showDriverLogoutRequired(
    BuildContext context, {
    required VoidCallback onConfirm,
  }) {
    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (BuildContext dialogContext) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Row(
            children: [
              Icon(Icons.warning_amber_rounded, color: Colors.orange, size: 24),
              SizedBox(width: 10),
              Text(
                "Logout Required",
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
              ),
            ],
          ),
          content: const Text(
            "To return to the home screen, you must first log out of your driver session.",
            style: TextStyle(fontSize: 13, height: 1.4),
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(dialogContext); // Close dialog
              },
              child: const Text(
                "Cancel",
                style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold),
              ),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(dialogContext); // Close dialog
                onConfirm(); // Execute full logout workflow
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.redAccent,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: const Text(
                "Log Out",
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        );
      },
    );
  }
}

class _LocationConsentDialog extends StatefulWidget {
  const _LocationConsentDialog({
    required this.isHardwareDisabled,
    required this.isDriver,
  });

  final bool isHardwareDisabled;
  final bool isDriver;

  @override
  State<_LocationConsentDialog> createState() => _LocationConsentDialogState();
}

class _LocationConsentDialogState extends State<_LocationConsentDialog> {
  bool _agreed = false;
  late final TapGestureRecognizer _policyTap;
  late final TapGestureRecognizer _agreeTap;

  @override
  void initState() {
    super.initState();
    _policyTap = TapGestureRecognizer()
      ..onTap = () => HomeDialogs.showPrivacyPolicy(context);
    _agreeTap = TapGestureRecognizer()
      ..onTap = () => setState(() => _agreed = !_agreed);
  }

  @override
  void dispose() {
    _policyTap.dispose();
    _agreeTap.dispose();
    super.dispose();
  }

  String get _disclosure {
    final use = widget.isDriver
        ? "$brandName collects your precise location while you are online, including when the app is in the background, to show your van on the live map and connect you with nearby customers. Customers can see your live position only while you are online."
        : "$brandName collects your precise location to show your position on the map and list vans near you. Your location is not shown to drivers.";
    if (!widget.isHardwareDisabled) return use;
    return "Your phone's location service is turned off. Turn it on to continue.\n\n$use";
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      title: Row(
        children: [
          Icon(
            widget.isHardwareDisabled ? Icons.location_off : Icons.location_on,
            color: AppColors.primaryBlue,
            size: 26,
          ),
          const SizedBox(width: 10),
          const Expanded(
            child: Text(
              "Enable GPS Tracking",
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
            ),
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              _disclosure,
              style: const TextStyle(
                fontSize: 13,
                height: 1.4,
                color: Colors.black87,
              ),
            ),
            const SizedBox(height: 12),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: 24,
                  height: 24,
                  child: Checkbox(
                    value: _agreed,
                    activeColor: AppColors.primaryBlue,
                    materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    onChanged: (value) =>
                        setState(() => _agreed = value ?? false),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text.rich(
                    TextSpan(
                      style: const TextStyle(
                        fontSize: 13,
                        height: 1.4,
                        color: Colors.black87,
                      ),
                      children: [
                        TextSpan(
                          text:
                              "I agree to this collection and use of my location, as described in the ",
                          recognizer: _agreeTap,
                        ),
                        TextSpan(
                          text: "Privacy Policy",
                          style: const TextStyle(
                            color: AppColors.primaryBlue,
                            fontWeight: FontWeight.bold,
                            decoration: TextDecoration.underline,
                          ),
                          recognizer: _policyTap,
                        ),
                        const TextSpan(text: "."),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context, false),
          child: const Text(
            "Cancel",
            style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold),
          ),
        ),
        ElevatedButton(
          onPressed: _agreed ? () => Navigator.pop(context, true) : null,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primaryBlue,
            disabledBackgroundColor: Colors.grey.shade300,
            disabledForegroundColor: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
          child: Text(
            "Enable GPS",
            style: TextStyle(
              color: _agreed ? Colors.white : Colors.grey.shade600,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      ],
    );
  }
}

const String _privacyPolicyText = '''$brandName uses location only to run the live van map.

Drivers. While you are online, we collect your precise location, including when the app is in the background, and show it to customers so they can see your van and you can receive nearby requests. When you go offline, your live position is removed from the customer map.

Customers. We collect your precise location to place you on the map and list vans near you. Your location is not shown to drivers.

Driver accounts. If you register as a driver, we store the name, mobile number, email address, and profile photo you provide, and we use them to operate your account.

Your choices. You can decline location access, turn off your phone's location service, or go offline at any time. You can also withdraw permission in your phone settings.

We use this information to provide the service. We do not sell your location.''';
