import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';
import '../../../core/app_colors.dart';

class DriverSignupModal extends StatefulWidget {
  final Function(String message, {bool isError}) showNotification;

  const DriverSignupModal({
    super.key,
    required this.showNotification,
  });

  @override
  State<DriverSignupModal> createState() => _DriverSignupModalState();
}

class _DriverSignupModalState extends State<DriverSignupModal> {
  // --- FIELD CONTROLLERS ---
  final _signUpNameController = TextEditingController();
  final _signUpMobileController = TextEditingController();
  final _signUpEmailController = TextEditingController();
  final _signUpPasswordController = TextEditingController();
  final _signUpCompanyController = TextEditingController();
  final _signUpAreaController = TextEditingController();
  final _signUpVehicleController = TextEditingController();
  final _signUpBioController = TextEditingController();

  // --- STATE VARS ---
  final List<String> _selectedServices = [];
  bool _insuranceConfirmed = false;

  // --- PICKED FILE PROPERTIES (BASE64) ---
  String? _profileImageName;
  String? _profileImageBase64;
  String? _vanImageName;
  String? _vanImageBase64;

  bool _isSubmitting = false;

  @override
  void dispose() {
    _signUpNameController.dispose();
    _signUpMobileController.dispose();
    _signUpEmailController.dispose();
    _signUpPasswordController.dispose();
    _signUpCompanyController.dispose();
    _signUpAreaController.dispose();
    _signUpVehicleController.dispose();
    _signUpBioController.dispose();
    super.dispose();
  }

  // --- DRIVER IMAGE PICKER PIPELINE ---
  Future<void> _pickImage(bool isProfileImage) async {
    try {
      FilePickerResult? result = await FilePicker.pickFiles(
        type: FileType.image,
      );

      if (result != null && result.files.single.path != null) {
        final filePath = result.files.single.path!;
        final fileName = result.files.single.name;

        // Read physical file bytes and encode to base64
        final File file = File(filePath);
        final List<int> imageBytes = await file.readAsBytes();
        final String base64Image = base64Encode(imageBytes);

        setState(() {
          if (isProfileImage) {
            _profileImageName = fileName;
            _profileImageBase64 = base64Image;
          } else {
            _vanImageName = fileName;
            _vanImageBase64 = base64Image;
          }
        });
      }
    } catch (e) {
      print("Error picking image: $e");
      widget.showNotification("Failed to pick image file.", isError: true);
    }
  }

  // --- NETWORK ACTION: SUBMIT SIGN UP ---
  Future<void> _submitSignup(BuildContext dialogContext) async {
    final name = _signUpNameController.text.trim();
    final mobile = _signUpMobileController.text.trim();
    final email = _signUpEmailController.text.trim();
    final password = _signUpPasswordController.text.trim();
    final company = _signUpCompanyController.text.trim();
    final area = _signUpAreaController.text.trim();
    final vehicle = _signUpVehicleController.text.trim();
    final bio = _signUpBioController.text.trim();

    // 1. Validation
    if (name.isEmpty || mobile.isEmpty || email.isEmpty || password.isEmpty) {
      widget.showNotification(
        "Please fill in all marked (*) required fields.",
        isError: true,
      );
      return;
    }

    if (!_insuranceConfirmed) {
      widget.showNotification(
        "You must confirm you are fully insured and operating legally.",
        isError: true,
      );
      return;
    }

    if (_profileImageBase64 == null || _vanImageBase64 == null) {
      widget.showNotification(
        "Both Profile Image and Van Image are mandatory.",
        isError: true,
      );
      return;
    }

    setState(() {
      _isSubmitting = true;
    });

    try {
      final backendUrl = dotenv.env['BACKEND_URL'] ?? 'http://10.0.2.2:5000';
      final response = await http.post(
        Uri.parse('$backendUrl/api/drivers/signup'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'fullName': name,
          'mobileNumber': mobile,
          'email': email,
          'password': password,
          'companyName': company.isNotEmpty ? company : null,
          'baseArea': area.isNotEmpty ? area : null,
          'vehicleType': vehicle.isNotEmpty ? vehicle : null,
          'shortBio': bio.isNotEmpty ? bio : null,
          'servicesOffered': _selectedServices,
          'profileImageBase64': _profileImageBase64,
          'profileImageName': _profileImageName,
          'vanImageBase64': _vanImageBase64,
          'vanImageName': _vanImageName,
        }),
      );

      final responseData = jsonDecode(response.body);

      if (response.statusCode == 201) {
        widget.showNotification(
          "Registration successful! Account is awaiting admin approval.",
        );

        if (mounted) Navigator.pop(dialogContext);
      } else {
        widget.showNotification(
          responseData['message'] ?? 'Registration failed. Try again.',
          isError: true,
        );
      }
    } catch (e) {
      print("Signup error: $e");
      widget.showNotification(
        "Unable to connect to the server. Check your connection or IP.",
        isError: true,
      );
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  Widget _buildField({
    required String label,
    required String hint,
    required TextEditingController controller,
    bool isPassword = false,
    int maxLines = 1,
    required VoidCallback onChanged,
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
            maxLines: maxLines,
            onChanged: (v) => onChanged(),
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

  Widget _buildFilePicker({
    required String label,
    required String? chosenFileName,
    required VoidCallback onChoose,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              ElevatedButton.icon(
                onPressed: onChoose,
                icon: const Icon(
                  Icons.attach_file,
                  size: 16,
                  color: AppColors.primaryBlue,
                ),
                label: const Text(
                  "Choose File",
                  style: TextStyle(color: AppColors.primaryBlue, fontSize: 12),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFE3F2FD),
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  chosenFileName ?? "No file chosen",
                  overflow: TextOverflow.ellipsis,
                  maxLines: 1,
                  style: const TextStyle(color: Colors.grey, fontSize: 11),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _sectionHeader(String title) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Align(
          alignment: Alignment.centerLeft,
          child: Text(
            title,
            style: const TextStyle(
              color: AppColors.primaryBlue,
              fontWeight: FontWeight.bold,
              fontSize: 16,
              decoration: TextDecoration.underline,
            ),
          ),
        ),
        const SizedBox(height: 15),
      ],
    );
  }

  Widget _buildServiceGrid(BuildContext context) {
    List<String> services = [
      "House Removals",
      "Single Item Transport",
      "Furniture Delivery",
      "Storage Moves",
      "Small Moves",
      "Waste Disposal",
    ];
    return Wrap(
      runSpacing: 4,
      spacing: 8,
      children: services
          .map(
            (s) => SizedBox(
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
            ),
          )
          .toList(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isFormValid =
        _signUpNameController.text.trim().isNotEmpty &&
        _signUpMobileController.text.trim().isNotEmpty &&
        _signUpEmailController.text.trim().isNotEmpty &&
        _signUpPasswordController.text.trim().isNotEmpty &&
        _insuranceConfirmed &&
        _profileImageBase64 != null &&
        _vanImageBase64 != null;

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
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    "Join the Fleet",
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primaryBlue,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.grey),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const Text(
                "Fill in your details to start your journey with Driver App.",
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12, color: Colors.grey),
              ),
              const SizedBox(height: 25),

              // --- PERSONAL DETAILS ---
              _sectionHeader("Personal Details"),
              _buildField(
                label: "Full / Display Name",
                hint: "John Doe",
                controller: _signUpNameController,
                onChanged: () => setState(() {}),
              ),
              _buildField(
                label: "Mobile Number",
                hint: "Used for customer calls",
                controller: _signUpMobileController,
                onChanged: () => setState(() {}),
              ),
              _buildField(
                label: "Email Address",
                hint: "john@example.com",
                controller: _signUpEmailController,
                onChanged: () => setState(() {}),
              ),
              _buildField(
                label: "Password",
                hint: "********",
                isPassword: true,
                controller: _signUpPasswordController,
                onChanged: () => setState(() {}),
              ),
              _buildField(
                label: "Company Name",
                hint: "LTD Name or Trading As",
                controller: _signUpCompanyController,
                onChanged: () => setState(() {}),
              ),
              _buildField(
                label: "Base Area",
                hint: "Rough town/postcode only",
                controller: _signUpAreaController,
                onChanged: () => setState(() {}),
              ),

              // --- VEHICLE INFO ---
              const SizedBox(height: 10),
              _sectionHeader("Vehicle & Professional Info"),
              _buildField(
                label: "Vehicle Type",
                hint: "e.g. Ford Transit",
                controller: _signUpVehicleController,
                onChanged: () => setState(() {}),
              ),

              Row(
                children: [
                  Checkbox(
                    value: _insuranceConfirmed,
                    onChanged: (v) {
                      setState(() {
                        _insuranceConfirmed = v ?? false;
                      });
                    },
                    activeColor: AppColors.primaryBlue,
                  ),
                  const Expanded(
                    child: Text(
                      "I confirm I am fully insured and operating legally *",
                      style: TextStyle(fontSize: 11),
                    ),
                  ),
                ],
              ),
              _buildField(
                label: "Short Bio (Optional)",
                hint: "Tell us about your experience...",
                maxLines: 3,
                controller: _signUpBioController,
                onChanged: () => setState(() {}),
              ),

              // --- SERVICES OFFERED ---
              const Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  "Services Offered (Optional)",
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
              ),
              const SizedBox(height: 10),
              Align(
                alignment: Alignment.centerLeft,
                child: _buildServiceGrid(context),
              ),

              const SizedBox(height: 24),
              _buildFilePicker(
                label: "PROFILE IMAGE *",
                chosenFileName: _profileImageName,
                onChoose: () => _pickImage(true),
              ),
              _buildFilePicker(
                label: "VAN IMAGE *",
                chosenFileName: _vanImageName,
                onChoose: () => _pickImage(false),
              ),

              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: (isFormValid && !_isSubmitting)
                    ? () => _submitSignup(context)
                    : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: isFormValid
                      ? AppColors.primaryBlue
                      : Colors.grey[300],
                  disabledBackgroundColor: Colors.grey[300],
                  minimumSize: const Size(double.infinity, 54),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  elevation: isFormValid ? 2 : 0,
                ),
                child: _isSubmitting
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                      )
                    : Text(
                        "Submit Registration",
                        style: TextStyle(
                          color: isFormValid ? Colors.white : Colors.grey[500],
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
              ),
              const SizedBox(height: 10),
            ],
          ),
        ),
      ),
    );
  }
}
