import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';
import '../../../core/app_colors.dart';

class DriverLoginModal extends StatefulWidget {
  final bool isDriverLive;
  final Function(String token, Map<String, dynamic> driver) onLoginSuccess;
  final Function(String email) onPendingApproval;
  final VoidCallback onSignUpPressed;
  final Function(String message, {bool isError}) showNotification;

  const DriverLoginModal({
    super.key,
    required this.isDriverLive,
    required this.onLoginSuccess,
    required this.onPendingApproval,
    required this.onSignUpPressed,
    required this.showNotification,
  });

  @override
  State<DriverLoginModal> createState() => _DriverLoginModalState();
}

class _DriverLoginModalState extends State<DriverLoginModal> {
  final _loginEmailController = TextEditingController();
  final _loginPasswordController = TextEditingController();
  bool _isLoading = false;

  @override
  void dispose() {
    _loginEmailController.dispose();
    _loginPasswordController.dispose();
    super.dispose();
  }

  Future<void> _submitLogin(BuildContext dialogContext) async {
    final email = _loginEmailController.text.trim();
    final password = _loginPasswordController.text.trim();

    if (email.isEmpty || password.isEmpty) {
      widget.showNotification("Email and password are required.", isError: true);
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final backendUrl = dotenv.env['BACKEND_URL'] ?? 'http://10.0.2.2:5000';
      final response = await http.post(
        Uri.parse('$backendUrl/api/drivers/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'password': password}),
      );

      final responseData = jsonDecode(response.body);

      if (response.statusCode == 200) {
        if (mounted) {
          Navigator.pop(dialogContext);
          widget.onLoginSuccess(responseData['token'], responseData['driver']);
        }
      } else if (response.statusCode == 403) {
        widget.showNotification(
          responseData['message'] ?? 'Your account is pending admin approval.',
          isError: true,
        );
        if (mounted) {
          Navigator.pop(dialogContext);
          widget.onPendingApproval(email);
        }
      } else {
        widget.showNotification(
          responseData['message'] ?? 'Invalid email or password.',
          isError: true,
        );
      }
    } catch (e) {
      print("Login error: $e");
      widget.showNotification(
        "Unable to connect to the server. Check your connection or IP.",
        isError: true,
      );
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Widget _buildField({
    required String label,
    required String hint,
    required TextEditingController controller,
    bool isPassword = false,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            "$label *",
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
          ),
          const SizedBox(height: 6),
          TextField(
            controller: controller,
            obscureText: isPassword,
            style: const TextStyle(fontSize: 13),
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: TextStyle(color: Colors.grey[400], fontSize: 13),
              filled: true,
              fillColor: const Color(0xFFF0F7FF),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 14,
                vertical: 12,
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide.none,
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide(color: Colors.blue[50]!),
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(24),
      ),
      backgroundColor: Colors.white,
      insetPadding: const EdgeInsets.symmetric(
        horizontal: 16,
        vertical: 24,
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    "Driver Portal",
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: Colors.black87,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.grey),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              const Text(
                "You are currently not visible to customers nearby.",
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: Colors.grey),
              ),
              const SizedBox(height: 12),

              // Dynamic Status Badge
              Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: widget.isDriverLive
                        ? const Color(0xFFE8F5E9)
                        : const Color(0xFFFFF5F5),
                    border: Border.all(
                      color: widget.isDriverLive
                          ? const Color(0xFF81C784)
                          : const Color(0xFFE57373),
                    ),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    widget.isDriverLive ? "STATUS : LIVE" : "STATUS : OFFLINE",
                    style: TextStyle(
                      color: widget.isDriverLive
                          ? const Color(0xFF2E7D32)
                          : const Color(0xFFC62828),
                      fontWeight: FontWeight.bold,
                      fontSize: 11,
                      letterSpacing: 0.8,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 24),

              _buildField(
                label: "Email Address",
                hint: "john@example.com",
                controller: _loginEmailController,
              ),
              _buildField(
                label: "Password",
                hint: "********",
                isPassword: true,
                controller: _loginPasswordController,
              ),

              // Align(
              //   alignment: Alignment.centerRight,
              //   child: TextButton(
              //     onPressed: () {},
              //     style: TextButton.styleFrom(
              //       padding: EdgeInsets.zero,
              //       minimumSize: Size.zero,
              //       tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              //     ),
              //     child: const Text(
              //       "Forgot Password?",
              //       style: TextStyle(
              //         color: AppColors.primaryBlue,
              //         fontSize: 12,
              //         fontWeight: FontWeight.w600,
              //         decoration: TextDecoration.underline,
              //       ),
              //     ),
              //   ),
              // ),
              const SizedBox(height: 24),

              ElevatedButton(
                onPressed: _isLoading ? null : () => _submitLogin(context),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primaryBlue,
                  minimumSize: const Size(double.infinity, 50),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: _isLoading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                      )
                    : const Text(
                        "Go Live",
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
              ),
              const SizedBox(height: 18),

              Center(
                child: GestureDetector(
                  onTap: () {
                    Navigator.pop(context);
                    widget.onSignUpPressed();
                  },
                  child: RichText(
                    text: const TextSpan(
                      style: TextStyle(color: Colors.black54, fontSize: 13),
                      children: [
                        TextSpan(text: "New to the platform? "),
                        TextSpan(
                          text: "Sign Up as a Driver",
                          style: TextStyle(
                            color: AppColors.primaryBlue,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 24),

              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(
                    Icons.lock_outline,
                    size: 18,
                    color: Colors.grey,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      "Your location is only shared when you are 'Live'. Your connection is encrypted and sessions are secured with bank-grade security protocols.",
                      style: TextStyle(
                        color: Colors.grey[600],
                        fontSize: 10,
                        height: 1.4,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
