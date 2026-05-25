import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';
import '../../../core/app_colors.dart';
import 'change_password_dialog.dart';

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
  bool _isSaving = false;

  late Map<String, dynamic> _currentDriver;

  late TextEditingController _nameCtrl;
  late TextEditingController _mobileCtrl;
  late TextEditingController _companyCtrl;
  late TextEditingController _areaCtrl;
  late TextEditingController _vehicleCtrl;
  late TextEditingController _bioCtrl;

  List<String> _selectedServices = [];

  String? _newProfileImageName;
  String? _newProfileImageBase64;
  String? _newVanImageName;
  String? _newVanImageBase64;

  final List<String> _servicesList = [
    "House Removals",
    "Single Item Transport",
    "Furniture Delivery",
    "Storage Moves",
    "Small Moves",
    "Waste Disposal",
  ];

  @override
  void initState() {
    super.initState();
    _currentDriver = widget.loggedInDriver ?? {};
    _initFields();
  }

  void _initFields() {
    _nameCtrl = TextEditingController(text: _currentDriver['fullName'] ?? '');
    _mobileCtrl = TextEditingController(text: _currentDriver['mobileNumber'] ?? '');
    _companyCtrl = TextEditingController(text: _currentDriver['companyName'] ?? '');
    _areaCtrl = TextEditingController(text: _currentDriver['baseArea'] ?? '');
    _vehicleCtrl = TextEditingController(text: _currentDriver['vehicleType'] ?? '');
    _bioCtrl = TextEditingController(text: _currentDriver['shortBio'] ?? '');
    
    _selectedServices.clear();
    if (_currentDriver['servicesOffered'] != null) {
      if (_currentDriver['servicesOffered'] is List) {
        _selectedServices = List<String>.from(_currentDriver['servicesOffered']);
      } else if (_currentDriver['servicesOffered'] is String) {
        try {
          _selectedServices = List<String>.from(jsonDecode(_currentDriver['servicesOffered']));
        } catch (_) {}
      }
    }

    _newProfileImageName = null;
    _newProfileImageBase64 = null;
    _newVanImageName = null;
    _newVanImageBase64 = null;
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _mobileCtrl.dispose();
    _companyCtrl.dispose();
    _areaCtrl.dispose();
    _vehicleCtrl.dispose();
    _bioCtrl.dispose();
    super.dispose();
  }

  bool get _hasChanges {
    if (_nameCtrl.text.trim() != (_currentDriver['fullName'] ?? '')) return true;
    if (_mobileCtrl.text.trim() != (_currentDriver['mobileNumber'] ?? '')) return true;
    if (_companyCtrl.text.trim() != (_currentDriver['companyName'] ?? '')) return true;
    if (_areaCtrl.text.trim() != (_currentDriver['baseArea'] ?? '')) return true;
    if (_vehicleCtrl.text.trim() != (_currentDriver['vehicleType'] ?? '')) return true;
    if (_bioCtrl.text.trim() != (_currentDriver['shortBio'] ?? '')) return true;
    
    if (_newProfileImageBase64 != null) return true;
    if (_newVanImageBase64 != null) return true;

    final originalServices = _currentDriver['servicesOffered'] != null 
        ? (_currentDriver['servicesOffered'] is String ? List<String>.from(jsonDecode(_currentDriver['servicesOffered'])) : List<String>.from(_currentDriver['servicesOffered']))
        : [];
    if (_selectedServices.length != originalServices.length) return true;
    for (String s in _selectedServices) {
      if (!originalServices.contains(s)) return true;
    }

    return false;
  }

  Future<void> _pickImage(bool isProfileImage) async {
    try {
      FilePickerResult? result = await FilePicker.pickFiles(type: FileType.image);
      if (result != null && result.files.single.path != null) {
        final File file = File(result.files.single.path!);
        final List<int> imageBytes = await file.readAsBytes();
        final String base64Image = base64Encode(imageBytes);

        setState(() {
          if (isProfileImage) {
            _newProfileImageName = result.files.single.name;
            _newProfileImageBase64 = base64Image;
          } else {
            _newVanImageName = result.files.single.name;
            _newVanImageBase64 = base64Image;
          }
        });
      }
    } catch (e) {
      print("Error picking image: $e");
      widget.showNotification("Failed to pick image file.", isError: true);
    }
  }

  Future<void> _saveDetails() async {
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
          'companyName': _companyCtrl.text.trim(),
          'baseArea': _areaCtrl.text.trim(),
          'vehicleType': _vehicleCtrl.text.trim(),
          'shortBio': _bioCtrl.text.trim(),
          'servicesOffered': _selectedServices,
          'profileImageBase64': _newProfileImageBase64,
          'profileImageName': _newProfileImageName,
          'vanImageBase64': _newVanImageBase64,
          'vanImageName': _newVanImageName,
        }),
      );

      final resData = jsonDecode(res.body);

      if (res.statusCode == 200) {
        // Update parent map and local memory
        final updatedDriver = resData['driver'];
        widget.onProfileUpdated(updatedDriver);
        
        setState(() {
          _currentDriver = updatedDriver;
          _isEditing = false; 
        });
        
        widget.showNotification("Profile updated successfully!", isError: false);
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
  }

  Widget _buildField({
    required String label,
    required String hint,
    required TextEditingController controller,
    bool isPassword = false,
    bool readOnly = false,
    int maxLines = 1,
    Widget? suffixIcon,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            "$label ${readOnly ? '' : '*'}",
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
          ),
          const SizedBox(height: 6),
          TextField(
            controller: controller,
            obscureText: isPassword,
            maxLines: maxLines,
            readOnly: readOnly,
            onChanged: (_) => setState(() {}),
            style: TextStyle(
              fontSize: 13, 
              color: readOnly ? Colors.grey[600] : Colors.black87
            ),
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: TextStyle(color: Colors.grey[400], fontSize: 13),
              filled: true,
              fillColor: readOnly ? Colors.grey[200] : const Color(0xFFF0F7FF),
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              suffixIcon: suffixIcon,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide.none,
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide(color: readOnly ? Colors.grey[300]! : Colors.blue[50]!),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide(
                  color: readOnly ? Colors.grey[300]! : AppColors.primaryBlue, 
                  width: readOnly ? 1 : 2
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildServiceGrid() {
    return Wrap(
      runSpacing: 4,
      spacing: 8,
      children: _servicesList.map((s) => SizedBox(
        width: MediaQuery.of(context).size.width * 0.38,
        child: Row(
          children: [
            Checkbox(
              value: _selectedServices.contains(s),
              onChanged: (v) {
                setState(() {
                  if (v == true) {
                    _selectedServices.add(s);
                  } else {
                    _selectedServices.remove(s);
                  }
                });
              },
              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
              activeColor: AppColors.primaryBlue,
            ),
            Expanded(
              child: Text(s, style: const TextStyle(fontSize: 11)),
            ),
          ],
        ),
      )).toList(),
    );
  }

  Widget _buildFilePicker({
    required String label,
    required String? newImageBase64,
    required String? originalImageUrl,
    required VoidCallback onChoose,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
          const SizedBox(height: 8),
          GestureDetector(
            onTap: onChoose,
            child: Container(
              height: 140,
              width: double.infinity,
              decoration: BoxDecoration(
                color: const Color(0xFFF0F7FF),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.primaryBlue.withOpacity(0.3), width: 1),
                image: newImageBase64 != null
                    ? DecorationImage(
                        image: MemoryImage(base64Decode(newImageBase64)),
                        fit: BoxFit.cover,
                      )
                    : (originalImageUrl != null
                        ? DecorationImage(
                            image: NetworkImage(widget.getCorrectImageUrl(originalImageUrl)),
                            fit: BoxFit.cover,
                          )
                        : null),
              ),
              child: (newImageBase64 == null && originalImageUrl == null)
                  ? Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.camera_alt, color: AppColors.primaryBlue.withOpacity(0.6), size: 32),
                        const SizedBox(height: 8),
                        Text(
                          "Tap to upload image",
                          style: TextStyle(color: AppColors.primaryBlue.withOpacity(0.8), fontSize: 12, fontWeight: FontWeight.bold),
                        ),
                      ],
                    )
                  : Align(
                      alignment: Alignment.bottomRight,
                      child: Container(
                        margin: const EdgeInsets.all(8),
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: AppColors.primaryBlue,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2),
                        ),
                        child: const Icon(Icons.edit, color: Colors.white, size: 16),
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (widget.loggedInDriver == null) return const SizedBox.shrink();

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      backgroundColor: Colors.white,
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: _isEditing ? _buildEditMode() : _buildViewMode(),
        ),
      ),
    );
  }

  // ================= VIEW MODE =================
  Widget _buildViewMode() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Align(
          alignment: Alignment.topRight,
          child: IconButton(
            icon: const Icon(Icons.close, color: Colors.grey),
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(),
            onPressed: () => Navigator.pop(context),
          ),
        ),
        
        Container(
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: AppColors.primaryBlue.withOpacity(0.3), width: 3),
            boxShadow: [
              BoxShadow(color: Colors.black.withOpacity(0.08), blurRadius: 10, spreadRadius: 2),
            ],
          ),
          child: CircleAvatar(
            radius: 45,
            backgroundColor: AppColors.primaryBlue.withOpacity(0.05),
            backgroundImage: _currentDriver['profileImageUrl'] != null
                ? NetworkImage(widget.getCorrectImageUrl(_currentDriver['profileImageUrl'])) as ImageProvider
                : null,
            child: _currentDriver['profileImageUrl'] == null
                ? const Icon(Icons.person, size: 45, color: AppColors.primaryBlue)
                : null,
          ),
        ),
        const SizedBox(height: 16),
        
        Text(
          _currentDriver['fullName'] ?? 'Driver',
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 22, color: Color(0xFF1E293B)),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 4),
        Text(
          _currentDriver['email'] ?? '',
          style: TextStyle(fontSize: 14, color: Colors.grey[600]),
          textAlign: TextAlign.center,
        ),
        if (_currentDriver['companyName'] != null && _currentDriver['companyName'].toString().isNotEmpty) ...[
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: AppColors.primaryBlue.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              _currentDriver['companyName'],
              style: const TextStyle(color: AppColors.primaryBlue, fontWeight: FontWeight.bold, fontSize: 12),
            ),
          )
        ],
        
        const SizedBox(height: 30),
        
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: () {
              setState(() {
                _initFields(); 
                _isEditing = true;
              });
            },
            icon: const Icon(Icons.edit, size: 18, color: Colors.white),
            label: const Text("Edit Profile", style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 15)),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primaryBlue,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: () => Navigator.pop(context),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  side: BorderSide(color: Colors.grey[300]!),
                ),
                child: Text("Cancel", style: TextStyle(color: Colors.grey[700], fontWeight: FontWeight.bold)),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () {
                  Navigator.pop(context);
                  widget.onLogout();
                },
                icon: const Icon(Icons.logout, size: 16, color: Colors.redAccent),
                label: const Text("Logout", style: TextStyle(fontWeight: FontWeight.bold, color: Colors.redAccent)),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  side: const BorderSide(color: Colors.redAccent, width: 1.5),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  // ================= EDIT MODE =================
  Widget _buildEditMode() {
    final isButtonActive = _hasChanges && !_isSaving;

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              "Edit Profile",
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.primaryBlue),
            ),
            IconButton(
              icon: const Icon(Icons.close, color: Colors.grey),
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
              onPressed: () {
                setState(() {
                  _isEditing = false;
                });
              },
            ),
          ],
        ),
        const SizedBox(height: 15),

        GestureDetector(
          onTap: () => _pickImage(true),
          child: Stack(
            children: [
              Container(
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.primaryBlue.withOpacity(0.3), width: 3),
                ),
                child: CircleAvatar(
                  radius: 45,
                  backgroundColor: AppColors.primaryBlue.withOpacity(0.05),
                  backgroundImage: _newProfileImageBase64 != null
                      ? MemoryImage(base64Decode(_newProfileImageBase64!))
                      : (_currentDriver['profileImageUrl'] != null
                          ? NetworkImage(widget.getCorrectImageUrl(_currentDriver['profileImageUrl'])) as ImageProvider
                          : null),
                  child: (_newProfileImageBase64 == null && _currentDriver['profileImageUrl'] == null)
                      ? const Icon(Icons.person, size: 45, color: AppColors.primaryBlue)
                      : null,
                ),
              ),
              Positioned(
                bottom: 0,
                right: 0,
                child: Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: AppColors.primaryBlue,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 2),
                  ),
                  child: const Icon(Icons.camera_alt, color: Colors.white, size: 14),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 25),

        _buildField(
          label: "Email Address",
          hint: _currentDriver['email'] ?? '',
          controller: TextEditingController(text: _currentDriver['email']),
          readOnly: true,
          suffixIcon: const Icon(Icons.lock, color: Colors.grey, size: 18),
        ),

        _buildField(
          label: "Password",
          hint: "********",
          controller: TextEditingController(),
          readOnly: true,
          isPassword: true,
          suffixIcon: TextButton(
            onPressed: () {
              showDialog(
                context: context,
                barrierDismissible: false,
                builder: (ctx) => ChangePasswordDialog(
                  jwtToken: widget.jwtToken,
                  showNotification: widget.showNotification,
                ),
              );
            },
            child: const Text("Reset", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
          ),
        ),

        const Divider(height: 30),

        _buildField(label: "Full Name", hint: "John Doe", controller: _nameCtrl),
        _buildField(label: "Mobile Number", hint: "Used for customer calls", controller: _mobileCtrl),
        _buildField(label: "Company Name", hint: "Trading As", controller: _companyCtrl),
        _buildField(label: "Base Area", hint: "Rough town/postcode", controller: _areaCtrl),
        _buildField(label: "Vehicle Type", hint: "e.g. Ford Transit", controller: _vehicleCtrl),
        _buildField(label: "Short Bio", hint: "Tell us about your experience...", controller: _bioCtrl, maxLines: 3),

        const Align(
          alignment: Alignment.centerLeft,
          child: Text("Services Offered", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
        ),
        const SizedBox(height: 10),
        Align(
          alignment: Alignment.centerLeft,
          child: _buildServiceGrid(),
        ),
        const SizedBox(height: 24),

        _buildFilePicker(
          label: "VEHICLE IMAGE",
          newImageBase64: _newVanImageBase64,
          originalImageUrl: _currentDriver['vanImageUrl'],
          onChoose: () => _pickImage(false),
        ),

        const SizedBox(height: 10),

        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: _isSaving
                    ? null
                    : () {
                        setState(() {
                          _isEditing = false;
                        });
                      },
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  side: BorderSide(color: Colors.grey[300]!),
                ),
                child: Text("Cancel", style: TextStyle(color: Colors.grey[700], fontWeight: FontWeight.bold)),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: ElevatedButton(
                onPressed: isButtonActive ? _saveDetails : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: isButtonActive ? AppColors.primaryBlue : Colors.grey[300],
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: _isSaving
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : Text(
                        "Save Details",
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: isButtonActive ? Colors.white : Colors.grey[600],
                        ),
                      ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
