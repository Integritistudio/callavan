import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';
import '../../../core/app_colors.dart';

class DriverProfileDialog extends StatefulWidget {
  final Map<String, dynamic>? loggedInDriver;
  final String? jwtToken;
  final VoidCallback onLogout;
  final Function(Map<String, dynamic> updatedDriver) onProfileUpdated;
  final Function(String message, {bool isError}) showNotification;
  final String Function(String?) getCorrectImageUrl;

  const DriverProfileDialog({
    super.key,
    required this.loggedInDriver,
    required this.jwtToken,
    required this.onLogout,
    required this.onProfileUpdated,
    required this.showNotification,
    required this.getCorrectImageUrl,
  });

  @override
  State<DriverProfileDialog> createState() => _DriverProfileDialogState();
}

class _DriverProfileDialogState extends State<DriverProfileDialog> {
  bool _isEditing = false;
  late TextEditingController _nameCtrl;
  late TextEditingController _mobileCtrl;
  String? _newProfileImageBase64;
  String? _newProfileImageName;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _nameCtrl = TextEditingController(text: widget.loggedInDriver?['fullName'] ?? '');
    _mobileCtrl = TextEditingController(text: widget.loggedInDriver?['mobileNumber'] ?? '');
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _mobileCtrl.dispose();
    super.dispose();
  }

  Widget _profileRow(IconData icon, String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: AppColors.primaryBlue, size: 20),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(
                  fontSize: 10,
                  color: Colors.grey,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 13,
                  color: Colors.black87,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    if (widget.loggedInDriver == null) {
      return const SizedBox.shrink();
    }

    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      title: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          GestureDetector(
            onTap: !_isEditing
                ? null
                : () async {
                    try {
                      FilePickerResult? pickResult = await FilePicker.pickFiles(type: FileType.image);
                      if (pickResult != null && pickResult.files.single.path != null) {
                        final File file = File(pickResult.files.single.path!);
                        final List<int> imageBytes = await file.readAsBytes();
                        setState(() {
                          _newProfileImageBase64 = base64Encode(imageBytes);
                          _newProfileImageName = pickResult.files.single.name;
                        });
                      }
                    } catch (e) {
                      print("Error picking profile image: $e");
                    }
                  },
            child: Stack(
              children: [
                Container(
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: AppColors.primaryBlue.withOpacity(0.3),
                      width: 3,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.08),
                        blurRadius: 10,
                        spreadRadius: 2,
                      ),
                    ],
                  ),
                  child: CircleAvatar(
                    radius: 40,
                    backgroundColor: AppColors.primaryBlue.withOpacity(0.05),
                    backgroundImage: _newProfileImageBase64 != null
                        ? MemoryImage(base64Decode(_newProfileImageBase64!))
                        : (widget.loggedInDriver?['profileImageUrl'] != null
                            ? NetworkImage(widget.getCorrectImageUrl(widget.loggedInDriver!['profileImageUrl'])) as ImageProvider
                            : null),
                    child: (_newProfileImageBase64 == null && widget.loggedInDriver?['profileImageUrl'] == null)
                        ? const Icon(
                            Icons.person,
                            size: 45,
                            color: AppColors.primaryBlue,
                          )
                        : null,
                  ),
                ),
                if (_isEditing)
                  Positioned(
                    bottom: 0,
                    right: 0,
                    child: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: AppColors.primaryBlue,
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 2),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.15),
                            blurRadius: 4,
                            spreadRadius: 1,
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.camera_alt,
                        color: Colors.white,
                        size: 14,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Text(
            _isEditing ? "Edit Profile Details" : (widget.loggedInDriver?['fullName'] ?? 'Driver Profile'),
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 20,
              color: Color(0xFF1E293B),
            ),
            textAlign: TextAlign.center,
          ),
          if (widget.loggedInDriver?['vehicleType'] != null && !_isEditing) ...[
            const SizedBox(height: 4),
            Text(
              widget.loggedInDriver!['vehicleType'],
              style: TextStyle(
                fontSize: 13,
                color: Colors.grey[600],
                fontWeight: FontWeight.w600,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Divider(),
            const SizedBox(height: 12),
            if (!_isEditing) ...[
              _profileRow(
                Icons.email,
                "Email Address",
                widget.loggedInDriver?['email'] ?? 'N/A',
              ),
              const SizedBox(height: 14),
              _profileRow(
                Icons.phone,
                "Mobile Number",
                widget.loggedInDriver?['mobileNumber'] ?? 'N/A',
              ),
              if (widget.loggedInDriver?['companyName'] != null &&
                  widget.loggedInDriver!['companyName'].toString().isNotEmpty) ...[
                const SizedBox(height: 14),
                _profileRow(
                  Icons.business,
                  "Company Name",
                  widget.loggedInDriver!['companyName'],
                ),
              ],
              if (widget.loggedInDriver?['baseArea'] != null &&
                  widget.loggedInDriver!['baseArea'].toString().isNotEmpty) ...[
                const SizedBox(height: 14),
                _profileRow(
                  Icons.location_on,
                  "Operating Base Area",
                  widget.loggedInDriver!['baseArea'],
                ),
              ],
            ] else ...[
              TextField(
                controller: _nameCtrl,
                textCapitalization: TextCapitalization.words,
                decoration: InputDecoration(
                  labelText: "Full Name",
                  prefixIcon: const Icon(Icons.person, color: AppColors.primaryBlue),
                  filled: true,
                  fillColor: Colors.grey[50],
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: Colors.grey[300]!),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: Colors.grey[300]!),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: AppColors.primaryBlue, width: 2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _mobileCtrl,
                keyboardType: TextInputType.phone,
                decoration: InputDecoration(
                  labelText: "Mobile Number",
                  prefixIcon: const Icon(Icons.phone, color: AppColors.primaryBlue),
                  filled: true,
                  fillColor: Colors.grey[50],
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: Colors.grey[300]!),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: Colors.grey[300]!),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: AppColors.primaryBlue, width: 2),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Card(
                color: Colors.blue[50]?.withOpacity(0.6),
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: BorderSide(color: Colors.blue[100]!, width: 1),
                ),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(Icons.shield, color: Colors.blue[700], size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          "Email, Company, Base Area, and Vehicle details cannot be changed by the driver to maintain system verification and security.",
                          style: TextStyle(
                            color: Colors.blue[900],
                            fontSize: 11,
                            height: 1.4,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
      actionsPadding: const EdgeInsets.symmetric(
        horizontal: 16,
        vertical: 12,
      ),
      actions: [
        if (_isEditing) ...[
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _isSaving
                      ? null
                      : () {
                          setState(() {
                            _isEditing = false;
                            _nameCtrl.text = widget.loggedInDriver?['fullName'] ?? '';
                            _mobileCtrl.text = widget.loggedInDriver?['mobileNumber'] ?? '';
                            _newProfileImageBase64 = null;
                            _newProfileImageName = null;
                          });
                        },
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    side: BorderSide(color: Colors.grey[350]!),
                  ),
                  child: Text(
                    "Cancel",
                    style: TextStyle(
                      color: Colors.grey[700],
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: _isSaving
                      ? null
                      : () async {
                          final String finalName = _nameCtrl.text.trim();
                          final String finalMobile = _mobileCtrl.text.trim();

                          if (finalName.isEmpty || finalMobile.isEmpty) {
                            widget.showNotification("Name and Mobile are required.", isError: true);
                            return;
                          }

                          setState(() {
                            _isSaving = true;
                          });

                          try {
                            final backendUrl = dotenv.env['BACKEND_URL'] ?? 'http://10.0.2.2:5000';
                            final res = await http.put(
                              Uri.parse('$backendUrl/api/drivers/profile'),
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': 'Bearer ${widget.jwtToken}',
                              },
                              body: jsonEncode({
                                'fullName': finalName,
                                'mobileNumber': finalMobile,
                                'profileImageBase64': _newProfileImageBase64,
                                'profileImageName': _newProfileImageName,
                              }),
                            );

                            final resData = jsonDecode(res.body);

                            if (res.statusCode == 200) {
                              widget.onProfileUpdated(resData['driver']);
                              widget.showNotification("Profile updated successfully!", isError: false);
                              if (mounted) Navigator.pop(context);
                            } else {
                              widget.showNotification(resData['message'] ?? "Failed to update profile.", isError: true);
                            }
                          } catch (e) {
                            print("Error updating profile: $e");
                            widget.showNotification("Server error. Check connection.", isError: true);
                          } finally {
                            if (mounted) {
                              setState(() {
                                _isSaving = false;
                              });
                            }
                          }
                        },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primaryBlue,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    elevation: 2,
                  ),
                  child: _isSaving
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                        )
                      : const Text(
                          "Save Details",
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                ),
              ),
            ],
          ),
        ] else ...[
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () {
                    setState(() {
                      _isEditing = true;
                    });
                  },
                  icon: const Icon(Icons.edit, size: 16, color: Colors.white),
                  label: const Text(
                    "Edit Profile",
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primaryBlue,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(context),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                        side: const BorderSide(color: Colors.grey),
                      ),
                      child: const Text(
                        "Close",
                        style: TextStyle(
                          color: Colors.grey,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.pop(context);
                        widget.onLogout();
                      },
                      icon: const Icon(Icons.logout, size: 16, color: Colors.white),
                      label: const Text(
                        "Logout",
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.redAccent,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ],
    );
  }
}
