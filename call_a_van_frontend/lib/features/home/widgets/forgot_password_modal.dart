import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';
import '../../../core/app_colors.dart';

enum ForgotPasswordState { enterEmail, verifyOtp, newPassword }

class ForgotPasswordModal extends StatefulWidget {
  final Function(String, {bool isError}) showNotification;
  final String? prefilledEmail;

  const ForgotPasswordModal({
    super.key,
    required this.showNotification,
    this.prefilledEmail,
  });

  @override
  State<ForgotPasswordModal> createState() => _ForgotPasswordModalState();
}

class _ForgotPasswordModalState extends State<ForgotPasswordModal> {
  ForgotPasswordState _currentState = ForgotPasswordState.enterEmail;
  bool _isLoading = false;

  final _emailController = TextEditingController();
  final _otpController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  bool _isNewVisible = false;
  bool _isConfirmVisible = false;

  Timer? _resendTimer;
  int _resendSeconds = 120;
  bool _canResend = false;

  @override
  void initState() {
    super.initState();
    if (widget.prefilledEmail != null) {
      _emailController.text = widget.prefilledEmail!;
    }
  }

  @override
  void dispose() {
    _emailController.dispose();
    _otpController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    _resendTimer?.cancel();
    super.dispose();
  }

  void _startResendTimer() {
    _resendSeconds = 120;
    _canResend = false;
    _resendTimer?.cancel();
    _resendTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_resendSeconds > 0) {
        if (mounted) setState(() => _resendSeconds--);
      } else {
        if (mounted) setState(() => _canResend = true);
        timer.cancel();
      }
    });
  }

  String get _formattedTime {
    int minutes = _resendSeconds ~/ 60;
    int seconds = _resendSeconds % 60;
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  // =======================================
  // API CALLS
  // =======================================

  Future<void> _requestOtp() async {
    final email = _emailController.text.trim();
    if (email.isEmpty) {
      widget.showNotification("Please enter your email address.", isError: true);
      return;
    }
    setState(() => _isLoading = true);
    try {
      final backendUrl = dotenv.env['BACKEND_URL'] ?? 'http://10.0.2.2:5000';
      final response = await http.post(
        Uri.parse('$backendUrl/api/drivers/forgot-password'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email}),
      );
      if (response.statusCode == 200) {
        widget.showNotification("OTP sent successfully!", isError: false);
        setState(() => _currentState = ForgotPasswordState.verifyOtp);
        _startResendTimer();
      } else {
        final resData = jsonDecode(response.body);
        widget.showNotification(resData['message'] ?? 'Failed to send OTP.', isError: true);
      }
    } catch (e) {
      widget.showNotification("Network error.", isError: true);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _verifyOtp() async {
    final email = _emailController.text.trim();
    final otp = _otpController.text.trim();
    if (otp.length != 6) {
      widget.showNotification("Please enter a valid 6-digit OTP.", isError: true);
      return;
    }
    setState(() => _isLoading = true);
    try {
      final backendUrl = dotenv.env['BACKEND_URL'] ?? 'http://10.0.2.2:5000';
      final response = await http.post(
        Uri.parse('$backendUrl/api/drivers/verify-reset-token'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'otp': otp}),
      );
      if (response.statusCode == 200) {
        widget.showNotification("Code Verified!", isError: false);
        _resendTimer?.cancel();
        setState(() => _currentState = ForgotPasswordState.newPassword);
      } else {
        final resData = jsonDecode(response.body);
        widget.showNotification(resData['message'] ?? 'Invalid or expired OTP.', isError: true);
      }
    } catch (e) {
      widget.showNotification("Network error.", isError: true);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _resetPassword() async {
    final email = _emailController.text.trim();
    final otp = _otpController.text.trim();
    final newPass = _newPasswordController.text;
    final confirmPass = _confirmPasswordController.text;

    if (newPass != confirmPass) {
      widget.showNotification("Passwords do not match.", isError: true);
      return;
    }
    if (newPass.length < 6 || newPass.length > 64) {
      widget.showNotification("Password must be between 6 and 64 characters.", isError: true);
      return;
    }
    setState(() => _isLoading = true);
    try {
      final backendUrl = dotenv.env['BACKEND_URL'] ?? 'http://10.0.2.2:5000';
      final response = await http.post(
        Uri.parse('$backendUrl/api/drivers/reset-password'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'otp': otp, 'newPassword': newPass}),
      );
      if (response.statusCode == 200) {
        widget.showNotification("Password Reset Successfully! Please log in.", isError: false);
        if (mounted) Navigator.pop(context); // Close the forgot password modal entirely
      } else {
        final resData = jsonDecode(response.body);
        widget.showNotification(resData['message'] ?? 'Failed to reset password.', isError: true);
      }
    } catch (e) {
      widget.showNotification("Network error.", isError: true);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // =======================================
  // UI COMPONENTS
  // =======================================

  Widget _buildField({
    required String label,
    required String hint,
    required TextEditingController controller,
    bool isPassword = false,
    bool? isVisible,
    VoidCallback? onToggleVisibility,
    TextInputType keyboardType = TextInputType.text,
    int? maxLength,
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
            obscureText: isPassword && !(isVisible ?? false),
            keyboardType: keyboardType,
            maxLength: maxLength,
            style: const TextStyle(fontSize: 13),
            decoration: InputDecoration(
              counterText: "",
              hintText: hint,
              hintStyle: TextStyle(color: Colors.grey[400], fontSize: 13),
              filled: true,
              fillColor: const Color(0xFFF0F7FF),
              suffixIcon: isPassword
                  ? IconButton(
                      icon: Icon((isVisible ?? false) ? Icons.visibility : Icons.visibility_off, color: Colors.grey, size: 18),
                      onPressed: onToggleVisibility,
                    )
                  : null,
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: Colors.blue[50]!)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(String title) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        if (_currentState != ForgotPasswordState.enterEmail)
          IconButton(
            icon: const Icon(Icons.arrow_back, color: Colors.black87),
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(),
            onPressed: () {
              setState(() {
                _currentState = ForgotPasswordState.enterEmail;
                _resendTimer?.cancel();
              });
            },
          )
        else
          const SizedBox.shrink(),
        Text(title, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.black87)),
        IconButton(
          icon: const Icon(Icons.close, color: Colors.grey),
          padding: EdgeInsets.zero,
          constraints: const BoxConstraints(),
          onPressed: () => Navigator.pop(context),
        ),
      ],
    );
  }

  Widget _buildEmailView() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _buildHeader("Reset Password"),
        const SizedBox(height: 12),
        const Text(
          "Enter your registered email address. We will send you a 6-digit verification code.",
          style: TextStyle(fontSize: 13, color: Colors.grey, height: 1.5),
        ),
        const SizedBox(height: 24),
        _buildField(label: "Email Address", hint: "john@example.com", controller: _emailController, keyboardType: TextInputType.emailAddress),
        const SizedBox(height: 24),
        ElevatedButton(
          onPressed: _isLoading ? null : _requestOtp,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primaryBlue,
            minimumSize: const Size(double.infinity, 50),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
          child: _isLoading
              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
              : const Text("Send Security Code", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
        ),
      ],
    );
  }

  Widget _buildOtpView() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _buildHeader("Enter Code"),
        const SizedBox(height: 12),
        RichText(
          text: TextSpan(
            style: const TextStyle(fontSize: 13, color: Colors.grey, height: 1.5),
            children: [
              const TextSpan(text: "We sent a 6-digit code to "),
              TextSpan(text: _emailController.text, style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.black87)),
              const TextSpan(text: ". Please enter it below."),
            ],
          ),
        ),
        const SizedBox(height: 24),
        _buildField(label: "6-Digit Code", hint: "000000", controller: _otpController, keyboardType: TextInputType.number, maxLength: 6),
        const SizedBox(height: 8),
        Center(
          child: _canResend
              ? TextButton(
                  onPressed: _isLoading ? null : _requestOtp,
                  child: const Text("Resend Code", style: TextStyle(color: AppColors.primaryBlue, fontWeight: FontWeight.bold)),
                )
              : Text("Didn't receive it? Resend in $_formattedTime", style: const TextStyle(color: Colors.grey, fontSize: 13, fontWeight: FontWeight.bold)),
        ),
        const SizedBox(height: 16),
        ElevatedButton(
          onPressed: _isLoading ? null : _verifyOtp,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primaryBlue,
            minimumSize: const Size(double.infinity, 50),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
          child: _isLoading
              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
              : const Text("Verify Code", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
        ),
      ],
    );
  }

  Widget _buildNewPasswordView() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _buildHeader("New Password"),
        const SizedBox(height: 12),
        const Text(
          "Your code was verified successfully. Please create a new password between 6 and 64 characters.",
          style: TextStyle(fontSize: 13, color: Colors.grey, height: 1.5),
        ),
        const SizedBox(height: 24),
        _buildField(label: "New Password", hint: "********", isPassword: true, isVisible: _isNewVisible, onToggleVisibility: () => setState(() => _isNewVisible = !_isNewVisible), controller: _newPasswordController),
        _buildField(label: "Confirm Password", hint: "********", isPassword: true, isVisible: _isConfirmVisible, onToggleVisibility: () => setState(() => _isConfirmVisible = !_isConfirmVisible), controller: _confirmPasswordController),
        const SizedBox(height: 24),
        ElevatedButton(
          onPressed: _isLoading ? null : _resetPassword,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primaryBlue,
            minimumSize: const Size(double.infinity, 50),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
          child: _isLoading
              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
              : const Text("Confirm New Password", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      backgroundColor: Colors.white,
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Builder(
            builder: (context) {
              switch (_currentState) {
                case ForgotPasswordState.enterEmail: return _buildEmailView();
                case ForgotPasswordState.verifyOtp: return _buildOtpView();
                case ForgotPasswordState.newPassword: return _buildNewPasswordView();
              }
            },
          ),
        ),
      ),
    );
  }
}
