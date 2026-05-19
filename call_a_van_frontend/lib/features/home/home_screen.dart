import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;
import 'package:file_picker/file_picker.dart';
import 'package:geolocator/geolocator.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import '../../core/app_colors.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  // --- SIGN UP FIELD CONTROLLERS ---
  final _signUpNameController = TextEditingController();
  final _signUpMobileController = TextEditingController();
  final _signUpEmailController = TextEditingController();
  final _signUpPasswordController = TextEditingController();
  final _signUpCompanyController = TextEditingController();
  final _signUpAreaController = TextEditingController();
  final _signUpVehicleController = TextEditingController();
  final _signUpBioController = TextEditingController();

  // --- LOGIN FIELD CONTROLLERS ---
  final _loginEmailController = TextEditingController();
  final _loginPasswordController = TextEditingController();

  // --- DRIVER FORM STATE VARS ---
  final List<String> _selectedServices = [];
  bool _insuranceConfirmed = false;

  // --- PICKED FILE PROPERTIES (BASE64) ---
  String? _profileImageName;
  String? _profileImageBase64;
  String? _vanImageName;
  String? _vanImageBase64;

  // --- SESSION AUTHENTICATION STATE ---
  String? _jwtToken;
  bool _isDriverLive = false;
  Map<String, dynamic>? _loggedInDriver;

  // --- REAL-TIME GPS & WEBSOCKET STREAM STATE ---
  IO.Socket? _socket;
  StreamSubscription<Position>? _gpsSubscription;
  StreamSubscription<ServiceStatus>? _serviceStatusSubscription;
  LatLng? _driverCurrentLocation;
  List<dynamic> _onlineDriversList = [];
  final MapController _mapController = MapController();

  @override
  void initState() {
    super.initState();
    _fetchLiveDriversInitial();
  }

  @override
  void dispose() {
    // Prevent memory leaks by properly disposing controllers and streams
    _signUpNameController.dispose();
    _signUpMobileController.dispose();
    _signUpEmailController.dispose();
    _signUpPasswordController.dispose();
    _signUpCompanyController.dispose();
    _signUpAreaController.dispose();
    _signUpVehicleController.dispose();
    _signUpBioController.dispose();
    _loginEmailController.dispose();
    _loginPasswordController.dispose();

    _gpsSubscription?.cancel();
    _serviceStatusSubscription?.cancel();
    _socket?.disconnect();
    _socket?.close();
    _mapController.dispose();

    super.dispose();
  }

  // --- DYNAMIC NOTIFICATION SYSTEM ---
  void _showNotification(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          message,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
        ),
        backgroundColor: isError ? Colors.redAccent : AppColors.successGreen,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        margin: const EdgeInsets.all(16),
        duration: const Duration(seconds: 4),
      ),
    );
  }

  // --- INITIAL HTTP REST CALL: FETCH ACTIVE DRIVER PINS ---
  Future<void> _fetchLiveDriversInitial() async {
    try {
      final backendUrl = dotenv.env['BACKEND_URL'] ?? 'http://10.0.2.2:5000';
      final response = await http.get(
        Uri.parse('$backendUrl/api/drivers/live'),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (mounted) {
          setState(() {
            _onlineDriversList = data['drivers'] ?? [];
          });
        }
      }
    } catch (e) {
      print("Error fetching initial active drivers: $e");
    }
  }

  // --- WEBSOCKET CLIENT CONFIGURATION ---
  void _initializeWebSocketStream() {
    try {
      final backendUrl = dotenv.env['BACKEND_URL'] ?? 'http://10.0.2.2:5000';

      // Prevent multiple parallel connection instances
      _socket?.disconnect();
      _socket?.close();

      _socket = IO.io(
        backendUrl,
        IO.OptionBuilder()
            .setTransports(['websocket'])
            .enableAutoConnect()
            .build(),
      );

      _socket?.onConnect((_) {
        print(
          "🔌 [WebSocket] Connected successfully with session ID: ${_socket?.id}",
        );
      });

      _socket?.onConnectError((err) {
        print("❌ [WebSocket] Connection error: $err");
      });

      // Listen for moving driver coordinate changes
      _socket?.on('driver_location_changed', (data) {
        if (mounted) {
          setState(() {
            final int driverId = data['driverId'];
            final double? lat = double.tryParse(
              data['latitude']?.toString() ?? '',
            );
            final double? lng = double.tryParse(
              data['longitude']?.toString() ?? '',
            );

            if (lat == null || lng == null || lat.isNaN || lng.isNaN) {
              return;
            }

            final index = _onlineDriversList.indexWhere(
              (d) => d['id'] == driverId,
            );
            if (index != -1) {
              _onlineDriversList[index]['latitude'] = lat;
              _onlineDriversList[index]['longitude'] = lng;
            } else {
              _fetchLiveDriversInitial();
            }
          });
        }
      });

      // Listen for driver going offline
      _socket?.on('driver_offline', (data) {
        if (mounted) {
          setState(() {
            final int driverId = data['driverId'];
            _onlineDriversList.removeWhere((d) => d['id'] == driverId);
          });
        }
      });
    } catch (e) {
      print("WebSocket setup failed: $e");
    }
  }

  // --- IN-APP DIALOG: PRE-PERMISSION / HARDWARE EXPLANATION ---
  Future<bool> _showLocationPermissionExplanationDialog({
    required bool isHardwareDisabled,
  }) async {
    final result = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Icon(
              isHardwareDisabled ? Icons.location_off : Icons.location_on,
              color: AppColors.primaryBlue,
              size: 26,
            ),
            const SizedBox(width: 10),
            const Text(
              "Enable GPS Tracking",
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              isHardwareDisabled
                  ? "Call-A-Van requires your phone's physical GPS hardware to be turned ON to list your vehicle on the live customer map."
                  : "To connect with active customers nearby and update your van coordinate in real-time, please allow Call-A-Van location permission.",
              style: const TextStyle(
                fontSize: 13,
                height: 1.4,
                color: Colors.black87,
              ),
            ),
            const SizedBox(height: 12),
            const Text(
              "Your location stream is highly secure and is only broadcasted when you are online.",
              style: TextStyle(fontSize: 11, color: Colors.grey),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text(
              "Cancel",
              style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold),
            ),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primaryBlue,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            child: const Text(
              "Enable GPS",
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
    return result ?? false;
  }

  // --- BACKGROUND SERVICE TOGGLE MONITOR ---
  void _registerLocationServiceStatusListener() {
    _serviceStatusSubscription?.cancel();
    _serviceStatusSubscription = Geolocator.getServiceStatusStream().listen((
      ServiceStatus status,
    ) {
      if (status == ServiceStatus.disabled && _isDriverLive) {
        // Force safety offline shutdown
        _toggleLiveStatus(false);
        _showNotification(
          "GPS services turned off. You have been set to Offline automatically.",
          isError: true,
        );
      }
    });
  }

  // --- GPS TRACKING TOGGLE PIPELINE ---
  Future<void> _toggleLiveStatus(bool goLive) async {
    if (goLive) {
      // 1. Force GPS Hardware Audit
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        final confirm = await _showLocationPermissionExplanationDialog(
          isHardwareDisabled: true,
        );
        if (!confirm) return;

        await Geolocator.openLocationSettings();
        return;
      }

      // 2. Force App Level Permissions Audit
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        final confirm = await _showLocationPermissionExplanationDialog(
          isHardwareDisabled: false,
        );
        if (!confirm) return;

        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          _showNotification(
            "GPS permissions are mandatory to broadcast live tracking signals.",
            isError: true,
          );
          return;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        _showNotification(
          "Location permissions permanently denied. Enable them in your app settings.",
          isError: true,
        );
        await Geolocator.openAppSettings();
        return;
      }

      // 3. Open Persistent WebSocket Tunnel
      _initializeWebSocketStream();

      // Subscribe to background status toggles
      _registerLocationServiceStatusListener();

      // 4. Subscribe to high-accuracy location tracking
      _gpsSubscription?.cancel();
      _gpsSubscription =
          Geolocator.getPositionStream(
            locationSettings: const LocationSettings(
              accuracy: LocationAccuracy.high,
              distanceFilter:
                  10, // Battery optimization: only emit coordinates if moved 10 meters!
            ),
          ).listen(
            (Position position) {
              final lat = position.latitude;
              final lng = position.longitude;

              if (lat.isNaN || lng.isNaN || lat.isInfinite || lng.isInfinite) {
                print(
                  "⚠️ [GPS] Ignored invalid NaN/Infinite coordinate: ($lat, $lng)",
                );
                return;
              }

              if (mounted) {
                setState(() {
                  _driverCurrentLocation = LatLng(lat, lng);
                  _isDriverLive = true;
                });

                // Smoothly pan camera to current driver position
                _mapController.move(LatLng(lat, lng), 14.5);
              }

              // Send current position to backend stream
              if (_socket != null && _socket!.connected) {
                _socket!.emit('update_location', {
                  'driverId': _loggedInDriver?['id'],
                  'latitude': lat,
                  'longitude': lng,
                });
              }
            },
            onError: (err) {
              print("GPS Stream Error: $err");
            },
          );

      setState(() {
        _isDriverLive = true;
      });

      _showNotification(
        "You are now LIVE on the map! Moving physical updates will update your coordinates.",
      );
    } else {
      // Clean up connections, but PRESERVE _driverCurrentLocation to show last offline coordinate
      _gpsSubscription?.cancel();
      _gpsSubscription = null;
      _serviceStatusSubscription?.cancel();
      _serviceStatusSubscription = null;
      _socket?.disconnect();
      _socket = null;

      setState(() {
        _isDriverLive = false;
      });

      _showNotification(
        "You went Offline. Location sharing has been safely terminated.",
        isError: false,
      );
    }
  }

  // --- DRIVER IMAGE PICKER PIPELINE ---
  Future<void> _pickImage(
    bool isProfileImage,
    StateSetter setDialogState,
  ) async {
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

        setDialogState(() {
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
      _showNotification("Failed to pick image file.", isError: true);
    }
  }

  // --- NETWORK ACTION: SUBMIT SIGN UP ---
  Future<void> _submitSignup(
    BuildContext dialogContext,
    StateSetter setDialogState,
  ) async {
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
      _showNotification(
        "Please fill in all marked (*) required fields.",
        isError: true,
      );
      return;
    }

    if (!_insuranceConfirmed) {
      _showNotification(
        "You must confirm you are fully insured and operating legally.",
        isError: true,
      );
      return;
    }

    if (_profileImageBase64 == null || _vanImageBase64 == null) {
      _showNotification(
        "Both Profile Image and Van Image are mandatory.",
        isError: true,
      );
      return;
    }

    setDialogState(
      () {},
    ); // Rebuild dialog state for visual processing feedback

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
        // Success
        _showNotification(
          "Registration successful! Account is awaiting admin approval.",
        );

        // Clean form inputs
        _signUpNameController.clear();
        _signUpMobileController.clear();
        _signUpEmailController.clear();
        _signUpPasswordController.clear();
        _signUpCompanyController.clear();
        _signUpAreaController.clear();
        _signUpVehicleController.clear();
        _signUpBioController.clear();
        _selectedServices.clear();
        _insuranceConfirmed = false;

        setState(() {
          _profileImageName = null;
          _profileImageBase64 = null;
          _vanImageName = null;
          _vanImageBase64 = null;
        });

        if (mounted) Navigator.pop(dialogContext);
      } else {
        // Validation/Custom Error
        _showNotification(
          responseData['message'] ?? 'Registration failed. Try again.',
          isError: true,
        );
      }
    } catch (e) {
      print("Signup error: $e");
      _showNotification(
        "Unable to connect to the server. Check your connection or IP.",
        isError: true,
      );
    }
  }

  // --- NETWORK ACTION: SUBMIT LOGIN ---
  Future<void> _submitLogin(
    BuildContext dialogContext,
    StateSetter setDialogState,
  ) async {
    final email = _loginEmailController.text.trim();
    final password = _loginPasswordController.text.trim();

    if (email.isEmpty || password.isEmpty) {
      _showNotification("Email and password are required.", isError: true);
      return;
    }

    try {
      final backendUrl = dotenv.env['BACKEND_URL'] ?? 'http://10.0.2.2:5000';
      final response = await http.post(
        Uri.parse('$backendUrl/api/drivers/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'password': password}),
      );

      final responseData = jsonDecode(response.body);

      if (response.statusCode == 200) {
        // Login Successful
        setState(() {
          _jwtToken = responseData['token'];
          _loggedInDriver = responseData['driver'];
        });

        _loginEmailController.clear();
        _loginPasswordController.clear();

        if (mounted) {
          Navigator.pop(dialogContext);
          _toggleLiveStatus(true);
        }
      } else if (response.statusCode == 403) {
        // Pending Admin Approval state
        _showNotification(
          responseData['message'] ?? 'Your account is pending admin approval.',
          isError: true,
        );

        // Show guidance instructions dialog
        if (mounted) {
          Navigator.pop(dialogContext);
          _showApprovalGuidanceDialog(email);
        }
      } else {
        // General Invalid Credentials
        _showNotification(
          responseData['message'] ?? 'Invalid email or password.',
          isError: true,
        );
      }
    } catch (e) {
      print("Login error: $e");
      _showNotification(
        "Unable to connect to the server. Check your connection or IP.",
        isError: true,
      );
    }
  }

  // --- INFO DIALOG: SHOW HOW TO APPROVE ---
  void _showApprovalGuidanceDialog(String email) {
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

  // --- POPUP DIALOG: DRIVER DETAILED PROFILE POPUP ---
  void _showDriverProfilePopup(BuildContext context) {
    bool isEditing = false;
    final TextEditingController nameCtrl = TextEditingController(text: _loggedInDriver?['fullName'] ?? '');
    final TextEditingController mobileCtrl = TextEditingController(text: _loggedInDriver?['mobileNumber'] ?? '');
    String? newProfileImageBase64;
    String? newProfileImageName;
    bool isSaving = false;

    showDialog(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (dialogContext, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              GestureDetector(
                onTap: !isEditing
                    ? null
                    : () async {
                        try {
                          FilePickerResult? pickResult = await FilePicker.pickFiles(type: FileType.image);
                          if (pickResult != null && pickResult.files.single.path != null) {
                            final File file = File(pickResult.files.single.path!);
                            final List<int> imageBytes = await file.readAsBytes();
                            setDialogState(() {
                              newProfileImageBase64 = base64Encode(imageBytes);
                              newProfileImageName = pickResult.files.single.name;
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
                        backgroundImage: newProfileImageBase64 != null
                            ? MemoryImage(base64Decode(newProfileImageBase64!))
                            : (_loggedInDriver?['profileImageUrl'] != null
                                ? NetworkImage(_getCorrectImageUrl(_loggedInDriver!['profileImageUrl'])) as ImageProvider
                                : null),
                        child: (newProfileImageBase64 == null && _loggedInDriver?['profileImageUrl'] == null)
                            ? const Icon(
                                Icons.person,
                                size: 45,
                                color: AppColors.primaryBlue,
                              )
                            : null,
                      ),
                    ),
                    if (isEditing)
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
                isEditing ? "Edit Profile Details" : (_loggedInDriver?['fullName'] ?? 'Driver Profile'),
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 20,
                  color: Color(0xFF1E293B),
                ),
                textAlign: TextAlign.center,
              ),
              if (_loggedInDriver?['vehicleType'] != null && !isEditing) ...[
                const SizedBox(height: 4),
                Text(
                  _loggedInDriver!['vehicleType'],
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
                if (!isEditing) ...[
                  _profileRow(
                    Icons.email,
                    "Email Address",
                    _loggedInDriver?['email'] ?? 'N/A',
                  ),
                  const SizedBox(height: 14),
                  _profileRow(
                    Icons.phone,
                    "Mobile Number",
                    _loggedInDriver?['mobileNumber'] ?? 'N/A',
                  ),
                  if (_loggedInDriver?['companyName'] != null &&
                      _loggedInDriver!['companyName'].toString().isNotEmpty) ...[
                    const SizedBox(height: 14),
                    _profileRow(
                      Icons.business,
                      "Company Name",
                      _loggedInDriver!['companyName'],
                    ),
                  ],
                  if (_loggedInDriver?['baseArea'] != null &&
                      _loggedInDriver!['baseArea'].toString().isNotEmpty) ...[
                    const SizedBox(height: 14),
                    _profileRow(
                      Icons.location_on,
                      "Operating Base Area",
                      _loggedInDriver!['baseArea'],
                    ),
                  ],
                ] else ...[
                  TextField(
                    controller: nameCtrl,
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
                    controller: mobileCtrl,
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
            if (isEditing) ...[
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: isSaving
                          ? null
                          : () {
                              setDialogState(() {
                                isEditing = false;
                                nameCtrl.text = _loggedInDriver?['fullName'] ?? '';
                                mobileCtrl.text = _loggedInDriver?['mobileNumber'] ?? '';
                                newProfileImageBase64 = null;
                                newProfileImageName = null;
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
                      onPressed: isSaving
                          ? null
                          : () async {
                              final String finalName = nameCtrl.text.trim();
                              final String finalMobile = mobileCtrl.text.trim();

                              if (finalName.isEmpty || finalMobile.isEmpty) {
                                _showNotification("Name and Mobile are required.", isError: true);
                                return;
                              }

                              setDialogState(() {
                                isSaving = true;
                              });

                              try {
                                final backendUrl = dotenv.env['BACKEND_URL'] ?? 'http://10.0.2.2:5000';
                                final res = await http.put(
                                  Uri.parse('$backendUrl/api/drivers/profile'),
                                  headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': 'Bearer $_jwtToken',
                                  },
                                  body: jsonEncode({
                                    'fullName': finalName,
                                    'mobileNumber': finalMobile,
                                    'profileImageBase64': newProfileImageBase64,
                                    'profileImageName': newProfileImageName,
                                  }),
                                );

                                final resData = jsonDecode(res.body);

                                if (res.statusCode == 200) {
                                  setState(() {
                                    _loggedInDriver = resData['driver'];
                                  });
                                  _showNotification("Profile updated successfully!", isError: false);
                                  Navigator.pop(dialogContext);
                                } else {
                                  _showNotification(resData['message'] ?? "Failed to update profile.", isError: true);
                                }
                              } catch (e) {
                                print("Error updating profile: $e");
                                _showNotification("Server error. Check connection.", isError: true);
                              } finally {
                                setDialogState(() {
                                  isSaving = false;
                                });
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
                      child: isSaving
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
                        setDialogState(() {
                          isEditing = true;
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
                          onPressed: () => Navigator.pop(dialogContext),
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
                            Navigator.pop(dialogContext);
                            _logoutDriver();
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
        ),
      ),
    );
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

  String _getCorrectImageUrl(String? rawUrl) {
    if (rawUrl == null || rawUrl.isEmpty) return '';
    final backendUrl = dotenv.env['BACKEND_URL'] ?? 'http://10.0.2.2:5000';
    String backendAuthority = Uri.parse(backendUrl).authority;
    if (backendAuthority.isEmpty) {
      backendAuthority = backendUrl.replaceAll('http://', '').replaceAll('https://', '');
    }
    if (rawUrl.startsWith('http')) {
      return rawUrl
          .replaceAll('localhost:5000', backendAuthority)
          .replaceAll('127.0.0.1:5000', backendAuthority);
    } else {
      return '$backendUrl$rawUrl';
    }
  }

  void _logoutDriver() async {
    // 1. Safety turn offline first
    await _toggleLiveStatus(false);

    setState(() {
      _jwtToken = null;
      _loggedInDriver = null;
    });

    _showNotification("Logged out successfully.", isError: false);
  }

  // --- REUSABLE FIELD BUILDER ---
  Widget _buildField({
    required String label,
    required String hint,
    TextEditingController? controller,
    bool isPassword = false,
    int maxLines = 1,
    ValueChanged<String>? onChanged,
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
            onChanged: onChanged,
            style: const TextStyle(fontSize: 13),
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: TextStyle(color: Colors.grey[400], fontSize: 13),
              filled: true,
              fillColor: const Color(0xFFF0F7FF), // Pristine Blue Shade
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

  // --- ATTACHMENT / FILE PICKER BUILDER ---
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

  // --- POPUP DIALOG: SIGN UP DIALOG ---
  void _showSignUpForm(BuildContext context) {
    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) {
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
                          onPressed: () => Navigator.pop(dialogContext),
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
                      onChanged: (v) => setDialogState(() {}),
                    ),
                    _buildField(
                      label: "Mobile Number",
                      hint: "Used for customer calls",
                      controller: _signUpMobileController,
                      onChanged: (v) => setDialogState(() {}),
                    ),
                    _buildField(
                      label: "Email Address",
                      hint: "john@example.com",
                      controller: _signUpEmailController,
                      onChanged: (v) => setDialogState(() {}),
                    ),
                    _buildField(
                      label: "Password",
                      hint: "********",
                      isPassword: true,
                      controller: _signUpPasswordController,
                      onChanged: (v) => setDialogState(() {}),
                    ),
                    _buildField(
                      label: "Company Name",
                      hint: "LTD Name or Trading As",
                      controller: _signUpCompanyController,
                    ),
                    _buildField(
                      label: "Base Area",
                      hint: "Rough town/postcode only",
                      controller: _signUpAreaController,
                    ),

                    // --- VEHICLE INFO ---
                    const SizedBox(height: 10),
                    _sectionHeader("Vehicle & Professional Info"),
                    _buildField(
                      label: "Vehicle Type",
                      hint: "e.g. Ford Transit",
                      controller: _signUpVehicleController,
                    ),

                    Row(
                      children: [
                        Checkbox(
                          value: _insuranceConfirmed,
                          onChanged: (v) {
                            setDialogState(() {
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
                      child: _buildServiceGrid(context, setDialogState),
                    ),

                    const SizedBox(height: 24),
                    _buildFilePicker(
                      label: "PROFILE IMAGE *",
                      chosenFileName: _profileImageName,
                      onChoose: () => _pickImage(true, setDialogState),
                    ),
                    _buildFilePicker(
                      label: "VAN IMAGE *",
                      chosenFileName: _vanImageName,
                      onChoose: () => _pickImage(false, setDialogState),
                    ),

                    const SizedBox(height: 20),
                    ElevatedButton(
                      onPressed: isFormValid
                          ? () => _submitSignup(dialogContext, setDialogState)
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
                      child: Text(
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
        },
      ),
    );
  }

  // --- POPUP DIALOG: LOGIN DIALOG ---
  void _showLoginForm(BuildContext context) {
    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => Dialog(
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
                        onPressed: () => Navigator.pop(dialogContext),
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
                        color: _isDriverLive
                            ? const Color(0xFFE8F5E9)
                            : const Color(0xFFFFF5F5),
                        border: Border.all(
                          color: _isDriverLive
                              ? const Color(0xFF81C784)
                              : const Color(0xFFE57373),
                        ),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        _isDriverLive ? "STATUS : LIVE" : "STATUS : OFFLINE",
                        style: TextStyle(
                          color: _isDriverLive
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

                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton(
                      onPressed: () {},
                      style: TextButton.styleFrom(
                        padding: EdgeInsets.zero,
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                      child: const Text(
                        "Forgot Password?",
                        style: TextStyle(
                          color: AppColors.primaryBlue,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          decoration: TextDecoration.underline,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  ElevatedButton(
                    onPressed: () =>
                        _submitLogin(dialogContext, setDialogState),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primaryBlue,
                      minimumSize: const Size(double.infinity, 50),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Text(
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
                        Navigator.pop(dialogContext);
                        _showSignUpForm(context);
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
        ),
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

  Widget _buildServiceGrid(BuildContext context, StateSetter setDialogState) {
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
                      setDialogState(() {
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
    return Scaffold(
      backgroundColor: AppColors.backgroundGrey,
      appBar: AppBar(
        backgroundColor: AppColors.primaryBlue,
        elevation: 0,
        title: Image.asset('assets/logo.png', height: 30),
        actions: [
          if (_jwtToken != null)
            GestureDetector(
              onTap: () => _showDriverProfilePopup(context),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                child: Container(
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 2),
                    boxShadow: const [
                      BoxShadow(
                        color: Colors.black12,
                        blurRadius: 4,
                        offset: Offset(0, 2),
                      ),
                    ],
                  ),
                  child: CircleAvatar(
                    radius: 18,
                    backgroundColor: Colors.white24,
                    backgroundImage: _loggedInDriver?['profileImageUrl'] != null
                        ? NetworkImage(_getCorrectImageUrl(_loggedInDriver!['profileImageUrl']))
                        : null,
                    child: _loggedInDriver?['profileImageUrl'] == null
                        ? const Icon(Icons.person, color: Colors.white, size: 20)
                        : null,
                  ),
                ),
              ),
            )
          else
            IconButton(
              icon: const Icon(Icons.login, color: Colors.white),
              onPressed: () => _showLoginForm(context),
            ),
          IconButton(
            icon: const Icon(Icons.menu, color: Colors.white),
            onPressed: () {},
          ),
        ],
      ),
      body: Column(
        children: [
          Container(
            width: double.infinity,
            color: AppColors.primaryBlue,
            padding: const EdgeInsets.symmetric(vertical: 15, horizontal: 20),
            child: const Column(
              children: [
                Text(
                  'See Who is Live Near You',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                SizedBox(height: 5),
                Text(
                  'Local drivers. Real-time availability. Call directly',
                  style: TextStyle(color: Colors.white70, fontSize: 12),
                ),
              ],
            ),
          ),
          Expanded(
            child: Stack(
              children: [
                // --- MAPBOX MAP CANVAS ---
                FlutterMap(
                  mapController: _mapController,
                  options: MapOptions(
                    initialCenter: const LatLng(51.5074, -0.1278), // London
                    initialZoom: 13.0,
                    minZoom: 4.0,
                    maxZoom: 18.0,
                  ),
                  children: [
                    TileLayer(
                      urlTemplate:
                          'https://api.mapbox.com/styles/v1/${dotenv.env['MAPBOX_USERNAME'] ?? 'mapbox'}/${dotenv.env['MAPBOX_STYLE_ID'] ?? 'streets-v12'}/tiles/256/{z}/{x}/{y}@2x?access_token=${dotenv.env['MAPBOX_ACCESS_TOKEN'] ?? ''}',
                      userAgentPackageName: 'com.example.call_a_van',
                    ),
                    MarkerLayer(
                      markers: [
                        // Draw all other active live drivers
                        ..._onlineDriversList.map((driver) {
                          final double? lat = double.tryParse(
                            driver['latitude']?.toString() ?? '',
                          );
                          final double? lng = double.tryParse(
                            driver['longitude']?.toString() ?? '',
                          );
                          final String fullName =
                              driver['fullName'] ?? 'Active Driver';

                          if (lat == null ||
                              lng == null ||
                              lat.isNaN ||
                              lng.isNaN ||
                              lat.isInfinite ||
                              lng.isInfinite) {
                            return const Marker(
                              width: 0,
                              height: 0,
                              point: LatLng(0, 0),
                              child: SizedBox.shrink(),
                            );
                          }

                          // Don't draw ourselves here since we render a custom green live indicator
                          if (driver['id'] == _loggedInDriver?['id']) {
                            return const Marker(
                              width: 0,
                              height: 0,
                              point: LatLng(0, 0),
                              child: SizedBox.shrink(),
                            );
                          }

                          return Marker(
                            width: 65.0,
                            height: 65.0,
                            point: LatLng(lat, lng),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 6,
                                    vertical: 2,
                                  ),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withOpacity(0.9),
                                    borderRadius: BorderRadius.circular(4),
                                    border: Border.all(
                                      color: AppColors.primaryBlue,
                                      width: 0.5,
                                    ),
                                  ),
                                  child: Text(
                                    fullName,
                                    style: const TextStyle(
                                      fontSize: 8,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.black87,
                                    ),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                const Icon(
                                  Icons.local_shipping,
                                  color: AppColors.primaryBlue,
                                  size: 26,
                                ),
                              ],
                            ),
                          );
                        }).toList(),

                        // Render our distinct personal radar pulse green ring when live
                        if (_isDriverLive &&
                            _driverCurrentLocation != null &&
                            !_driverCurrentLocation!.latitude.isNaN &&
                            !_driverCurrentLocation!.longitude.isNaN &&
                            !_driverCurrentLocation!.latitude.isInfinite &&
                            !_driverCurrentLocation!.longitude.isInfinite)
                          Marker(
                            width: 80.0,
                            height: 80.0,
                            point: _driverCurrentLocation!,
                            child: const LiveRadarMarker(),
                          )
                        else if (!_isDriverLive &&
                            _driverCurrentLocation != null &&
                            !_driverCurrentLocation!.latitude.isNaN &&
                            !_driverCurrentLocation!.longitude.isNaN &&
                            !_driverCurrentLocation!.latitude.isInfinite &&
                            !_driverCurrentLocation!.longitude.isInfinite)
                          // Render our last known offline position as a generic grey marker pin!
                          Marker(
                            width: 50.0,
                            height: 50.0,
                            point: _driverCurrentLocation!,
                            child: Stack(
                              alignment: Alignment.center,
                              children: [
                                const Icon(
                                  Icons.circle,
                                  color: Colors.black26,
                                  size: 40,
                                ),
                                const Icon(
                                  Icons.circle,
                                  color: Colors.white,
                                  size: 26,
                                ),
                                const Icon(
                                  Icons.circle,
                                  color: Colors.grey,
                                  size: 16,
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ],
                ),

                // --- TOP-RIGHT COMPASS ---
                Positioned(
                  top: 16,
                  right: 16,
                  child: Container(
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black12,
                          blurRadius: 4,
                          offset: Offset(0, 2),
                        ),
                      ],
                    ),
                    child: IconButton(
                      icon: const Icon(
                        Icons.navigation,
                        color: Colors.black54,
                        size: 20,
                      ),
                      onPressed: () {},
                    ),
                  ),
                ),

                // --- BOTTOM-CENTER DYNAMIC CAPSULE PILL OVERLAY ---
                Positioned(
                  bottom: 16,
                  left: 0,
                  right: 0,
                  child: Center(
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: const [
                          BoxShadow(
                            color: Colors.black12,
                            blurRadius: 8,
                            offset: Offset(0, 3),
                          ),
                        ],
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              color: _isDriverLive
                                  ? AppColors.successGreen
                                  : Colors.orangeAccent,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            _isDriverLive
                                ? "🟢 You are Online & Tracking"
                                : "${_onlineDriversList.length} Drivers Online Near You",
                            style: const TextStyle(
                              color: Colors.black87,
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.all(12),
            color: AppColors.primaryBlue,
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => _showSignUpForm(context),
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
                    onPressed: _jwtToken == null
                        ? () => _showLoginForm(context)
                        : () => _toggleLiveStatus(!_isDriverLive),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _isDriverLive
                          ? Colors.redAccent
                          : AppColors.successGreen,
                    ),
                    child: Text(
                      _isDriverLive ? "Go Offline" : "Go Live",
                      style: const TextStyle(color: Colors.white),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// --- HIGHLY PREMIUM REAL-TIME ANIMATED RADAR PULSE MARKER ---
class LiveRadarMarker extends StatefulWidget {
  const LiveRadarMarker({super.key});

  @override
  State<LiveRadarMarker> createState() => _LiveRadarMarkerState();
}

class _LiveRadarMarkerState extends State<LiveRadarMarker>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        final progress = _controller.value;
        return Stack(
          alignment: Alignment.center,
          children: [
            // Expanding ring 1
            Transform.scale(
              scale: 1.0 + (progress * 1.5),
              child: Opacity(
                opacity: (1.0 - progress).clamp(0.0, 1.0),
                child: Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: Colors.greenAccent.withOpacity(0.6),
                      width: 2.0,
                    ),
                    color: Colors.greenAccent.withOpacity(0.15),
                  ),
                ),
              ),
            ),
            // Expanding ring 2 (delayed by 0.5)
            Transform.scale(
              scale: 1.0 + (((progress + 0.5) % 1.0) * 1.5),
              child: Opacity(
                opacity: (1.0 - ((progress + 0.5) % 1.0)).clamp(0.0, 1.0),
                child: Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: Colors.greenAccent.withOpacity(0.4),
                      width: 1.5,
                    ),
                    color: Colors.greenAccent.withOpacity(0.1),
                  ),
                ),
              ),
            ),
            // Solid inner circle
            const Icon(Icons.circle, color: Colors.white, size: 26),
            const Icon(
              Icons.circle,
              color: Color(0xFF2E7D32), // Vibrant successGreen match
              size: 16,
            ),
          ],
        );
      },
    );
  }
}
