import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';
import '../../../core/app_colors.dart';

class ChangePasswordDialog extends StatefulWidget {
  final String? jwtToken;
  final Function(String, {bool isError}) showNotification;

  const ChangePasswordDialog({
    super.key,
    required this.jwtToken,
    required this.showNotification,
  });

  @override
  State<ChangePasswordDialog> createState() => _ChangePasswordDialogState();
}

class _ChangePasswordDialogState extends State<ChangePasswordDialog> {
  final _currentController = TextEditingController();
  final _newController = TextEditingController();
  final _confirmController = TextEditingController();

  bool _isCurrentVisible = false;
  bool _isNewVisible = false;
  bool _isConfirmVisible = false;
  bool _isLoading = false;

  Future<void> _submit() async {
    final curPass = _currentController.text;
    final newPass = _newController.text;
    final confPass = _confirmController.text;

    if (curPass.isEmpty || newPass.isEmpty) {
      widget.showNotification("Fields cannot be empty", isError: true);
      return;
    }
    if (newPass != confPass) {
      widget.showNotification("New passwords do not match", isError: true);
      return;
    }
    if (newPass.length < 6 || newPass.length > 64) {
      widget.showNotification("Password must be between 6 and 64 characters", isError: true);
      return;
    }

    setState(() => _isLoading = true);
    try {
      final backendUrl = dotenv.env['BACKEND_URL'] ?? 'http://10.0.2.2:5000';
      final response = await http.put(
        Uri.parse('$backendUrl/api/drivers/change-password'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${widget.jwtToken}',
        },
        body: jsonEncode({
          'currentPassword': curPass,
          'newPassword': newPass,
        }),
      );

      if (response.statusCode == 200) {
        widget.showNotification("Password Updated Successfully!", isError: false);
        if (mounted) Navigator.pop(context);
      } else {
        final resData = jsonDecode(response.body);
        widget.showNotification(resData['message'] ?? 'Failed to update password', isError: true);
      }
    } catch (e) {
      widget.showNotification("Network error", isError: true);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Widget _buildPassField(String label, TextEditingController ctrl, bool isVisible, VoidCallback onToggle) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.black87),
          ),
          const SizedBox(height: 6),
          TextField(
            controller: ctrl,
            obscureText: !isVisible,
            style: const TextStyle(fontSize: 13),
            decoration: InputDecoration(
              hintText: "********",
              hintStyle: TextStyle(color: Colors.grey[400], fontSize: 13),
              filled: true,
              fillColor: const Color(0xFFF0F7FF),
              suffixIcon: IconButton(
                icon: Icon(isVisible ? Icons.visibility : Icons.visibility_off, size: 18, color: Colors.grey),
                onPressed: onToggle,
              ),
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
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
      backgroundColor: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text("Change Password", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.primaryBlue)),
                IconButton(
                  icon: const Icon(Icons.close, color: Colors.grey),
                  onPressed: () => Navigator.pop(context),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                )
              ],
            ),
            const SizedBox(height: 16),
            _buildPassField("Current Password", _currentController, _isCurrentVisible, () => setState(() => _isCurrentVisible = !_isCurrentVisible)),
            _buildPassField("New Password", _newController, _isNewVisible, () => setState(() => _isNewVisible = !_isNewVisible)),
            _buildPassField("Confirm New Password", _confirmController, _isConfirmVisible, () => setState(() => _isConfirmVisible = !_isConfirmVisible)),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: _isLoading ? null : _submit,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primaryBlue,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                padding: const EdgeInsets.symmetric(vertical: 12)
              ),
              child: _isLoading 
                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : const Text("Save New Password", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
            )
          ],
        ),
      ),
    );
  }
}
