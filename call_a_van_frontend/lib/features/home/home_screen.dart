import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'dart:ui' as ui;
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart' as geo;
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/app_colors.dart';
import 'welcome_screen.dart';
import 'widgets/radar_animation_marker.dart';
import 'widgets/driver_login_modal.dart';
import 'widgets/driver_signup_modal.dart';
import 'widgets/driver_profile_dialog.dart';

class HomeScreen extends StatefulWidget {
  final bool isDriverMode;
  final String? initialToken;
  final Map<String, dynamic>? initialDriver;

  const HomeScreen({
    super.key,
    required this.isDriverMode,
    this.initialToken,
    this.initialDriver,
  });

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  // --- SESSION AUTHENTICATION STATE ---
  String? _jwtToken;
  bool _isDriverLive = false;
  Map<String, dynamic>? _loggedInDriver;

  // --- REAL-TIME GPS & WEBSOCKET STREAM STATE ---
  IO.Socket? _socket;
  StreamSubscription<Position>? _gpsSubscription;
  StreamSubscription<Position>? _userLocationSubscription;
  StreamSubscription<ServiceStatus>? _serviceStatusSubscription;
  LatLng? _driverCurrentLocation;
  LatLng? _userCurrentLocation;
  List<dynamic> _onlineDriversList = [];
  bool _isLocatingUser = false;
  String? _userAddress;
  bool _isFetchingAddress = false;
  bool _showAddressTooltip = false;
  LatLng? _addressFetchLocation;
  OverlayEntry? _currentNotificationOverlay;
  Timer? _notificationTimer;
  final MapController _mapController = MapController();

  @override
  void initState() {
    super.initState();
    _jwtToken = widget.initialToken;
    _loggedInDriver = widget.initialDriver;
    _fetchLiveDriversInitial();
    _registerLocationServiceStatusListener();
    if (!widget.isDriverMode) {
      _initializeWebSocketStream();
    } else if (_jwtToken != null) {
      _isDriverLive = true;
      _toggleLiveStatus(true);
    }
  }

  @override
  void dispose() {
    _gpsSubscription?.cancel();
    _userLocationSubscription?.cancel();
    _serviceStatusSubscription?.cancel();
    _socket?.disconnect();
    _socket?.close();
    _mapController.dispose();
    _currentNotificationOverlay?.remove();
    _notificationTimer?.cancel();
    super.dispose();
  }

  // --- DYNAMIC NOTIFICATION SYSTEM ---
  void _showNotification(String message, {bool isError = false}) {
    // 1. Clean up any existing active overlay
    if (_currentNotificationOverlay != null) {
      try {
        _currentNotificationOverlay!.remove();
      } catch (_) {}
      _currentNotificationOverlay = null;
    }
    _notificationTimer?.cancel();

    // 2. Build the new overlay entry
    _currentNotificationOverlay = OverlayEntry(
      builder: (context) {
        return Positioned(
          bottom: 24.0 + MediaQuery.of(context).viewInsets.bottom, // Keyboard responsive overlay position
          left: 16.0,
          right: 16.0,
          child: Material(
            color: Colors.transparent,
            child: Dismissible(
              key: UniqueKey(),
              direction: DismissDirection.horizontal,
              onDismissed: (direction) {
                if (_currentNotificationOverlay != null) {
                  try {
                    _currentNotificationOverlay!.remove();
                  } catch (_) {}
                  _currentNotificationOverlay = null;
                }
                _notificationTimer?.cancel();
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: BoxDecoration(
                  color: isError ? Colors.redAccent : AppColors.successGreen,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: const [
                    BoxShadow(
                      color: Colors.black26,
                      blurRadius: 10,
                      offset: Offset(0, 5),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Icon(
                      isError ? Icons.error_outline : Icons.check_circle_outline,
                      color: Colors.white,
                      size: 20,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        message,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );

    // 3. Mount in the application Overlay Stack (shows on top of dialogs/modals)
    if (mounted) {
      Overlay.of(context).insert(_currentNotificationOverlay!);
    }

    // 4. Auto-dismiss timeout
    _notificationTimer = Timer(const Duration(seconds: 4), () {
      if (_currentNotificationOverlay != null) {
        try {
          _currentNotificationOverlay!.remove();
        } catch (_) {}
        _currentNotificationOverlay = null;
      }
    });
  }

  int get _nearbyDriversCount {
    if (_userCurrentLocation == null) return _onlineDriversList.length;
    int count = 0;
    for (var driver in _onlineDriversList) {
      final double? lat = double.tryParse(driver['latitude']?.toString() ?? '');
      final double? lng = double.tryParse(driver['longitude']?.toString() ?? '');
      if (lat != null && lng != null && !lat.isNaN && !lng.isNaN) {
        final double distanceInMeters = Geolocator.distanceBetween(
          _userCurrentLocation!.latitude,
          _userCurrentLocation!.longitude,
          lat,
          lng,
        );
        if (distanceInMeters <= 8046.72) {
          count++;
        }
      }
    }
    return count;
  }

  Future<void> _fetchUserAddress(LatLng coordinates) async {
    if (_isFetchingAddress) return;
    setState(() {
      _isFetchingAddress = true;
      _showAddressTooltip = true;
      _addressFetchLocation = coordinates;
      _userAddress = "Loading address...";
    });
    try {
      final placemarks = await geo.placemarkFromCoordinates(
        coordinates.latitude,
        coordinates.longitude,
      );
      if (placemarks.isNotEmpty) {
        final p = placemarks.first;
        final name = p.name ?? '';
        final street = p.street ?? '';
        final subLocality = p.subLocality ?? '';
        final locality = p.locality ?? '';
        final country = p.country ?? '';

        List<String> parts = [];
        if (street.isNotEmpty && street != name) parts.add(street);
        else if (name.isNotEmpty) parts.add(name);
        if (subLocality.isNotEmpty) parts.add(subLocality);
        if (locality.isNotEmpty) parts.add(locality);
        if (country.isNotEmpty) parts.add(country);

        if (mounted) {
          setState(() {
            _userAddress = parts.join(', ');
          });
        }
      } else {
        if (mounted) {
          setState(() {
            _userAddress = "Coordinates: ${coordinates.latitude.toStringAsFixed(4)}, ${coordinates.longitude.toStringAsFixed(4)}";
          });
        }
      }
    } catch (e) {
      print("Geocoding Error: $e");
      if (mounted) {
        setState(() {
          _userAddress = "${coordinates.latitude.toStringAsFixed(4)}, ${coordinates.longitude.toStringAsFixed(4)}";
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isFetchingAddress = false;
        });
      }
    }
  }

  Future<void> _enableUserLocation() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      final confirm = await _showLocationPermissionExplanationDialog(
        isHardwareDisabled: true,
      );
      if (!confirm) return;

      await Geolocator.openLocationSettings();
      // Auto-reverify location service status when returning from Settings screen
      serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) return;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      final confirm = await _showLocationPermissionExplanationDialog(
        isHardwareDisabled: false,
      );
      if (!confirm) return;

      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        _showNotification(
          "Location permission is required to find drivers near you.",
          isError: true,
        );
        return;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      _showNotification(
        "Location permissions permanently denied. Please enable them in settings.",
        isError: true,
      );
      await Geolocator.openAppSettings();
      return;
    }

    setState(() {
      _isLocatingUser = true;
    });

    try {
      await _userLocationSubscription?.cancel();

      // Get initial position quickly to center map
      final Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      if (mounted) {
        setState(() {
          _userCurrentLocation = LatLng(position.latitude, position.longitude);
        });
        _mapController.move(_userCurrentLocation!, 14.0);
      }

      // Subscribe to live updates so position moves with the user
      _userLocationSubscription = Geolocator.getPositionStream(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          distanceFilter: 5,
        ),
      ).listen(
        (Position pos) {
          final lat = pos.latitude;
          final lng = pos.longitude;
          if (lat.isNaN || lng.isNaN || lat.isInfinite || lng.isInfinite) return;

          if (mounted) {
            setState(() {
              _userCurrentLocation = LatLng(lat, lng);

              if (_showAddressTooltip && _addressFetchLocation != null) {
                final double distance = Geolocator.distanceBetween(
                  _addressFetchLocation!.latitude,
                  _addressFetchLocation!.longitude,
                  lat,
                  lng,
                );
                if (distance > 20) {
                  _showAddressTooltip = false;
                  _addressFetchLocation = null;
                }
              }
            });
          }
        },
        onError: (err) {
          print("User location stream error: $err");
        },
      );
    } catch (e) {
      print("Error getting user location: $e");
      _showNotification("Failed to fetch your current location.", isError: true);
    } finally {
      if (mounted) {
        setState(() {
          _isLocatingUser = false;
        });
      }
    }
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
      if (status == ServiceStatus.disabled) {
        if (widget.isDriverMode) {
          if (_isDriverLive) {
            _toggleLiveStatus(false);
            _showNotification(
              "GPS services turned off. You have been set to Offline automatically.",
              isError: true,
            );
          }
        } else {
          if (_userCurrentLocation != null) {
            _userLocationSubscription?.cancel();
            setState(() {
              _userCurrentLocation = null;
            });
            _showNotification(
              "GPS services turned off. Location marker cleared.",
              isError: true,
            );
          }
        }
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
        // Auto-reverify location service status when returning from Settings screen
        serviceEnabled = await Geolocator.isLocationServiceEnabled();
        if (!serviceEnabled) return;
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

  Future<void> _handleLoginSuccess(String token, Map<String, dynamic> driver) async {
    setState(() {
      _jwtToken = token;
      _loggedInDriver = driver;
    });

    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('jwt_token', token);
      await prefs.setString('logged_in_driver', jsonEncode(driver));
    } catch (e) {
      print("Error saving driver session: $e");
    }

    _toggleLiveStatus(true);
  }

  void _logoutDriver() async {
    // 1. Safety turn offline first
    await _toggleLiveStatus(false);

    setState(() {
      _jwtToken = null;
      _loggedInDriver = null;
    });

    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('jwt_token');
      await prefs.remove('logged_in_driver');
    } catch (e) {
      print("Error clearing driver session: $e");
    }

    _showNotification("Logged out successfully.", isError: false);

    if (mounted) {
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (context) => const WelcomeScreen()),
        (route) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundGrey,
      appBar: AppBar(
        automaticallyImplyLeading: false,
        centerTitle: false,
        backgroundColor: AppColors.primaryBlue,
        elevation: 0,
        title: Image.asset('assets/logo.png', height: 30),
        actions: [
          if (widget.isDriverMode) ...[
            if (_jwtToken != null)
              GestureDetector(
                onTap: () {
                  showDialog(
                    context: context,
                    builder: (context) => DriverProfileDialog(
                      loggedInDriver: _loggedInDriver,
                      jwtToken: _jwtToken,
                      onLogout: _logoutDriver,
                      onProfileUpdated: (updatedDriver) {
                        setState(() {
                          _loggedInDriver = updatedDriver;
                        });
                      },
                      showNotification: _showNotification,
                      getCorrectImageUrl: _getCorrectImageUrl,
                    ),
                  );
                },
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
                onPressed: () {
                  showDialog(
                    context: context,
                    builder: (context) => DriverLoginModal(
                      isDriverLive: _isDriverLive,
                      onLoginSuccess: _handleLoginSuccess,
                      onPendingApproval: (email) {
                        _showApprovalGuidanceDialog(email);
                      },
                      onSignUpPressed: () {
                        showDialog(
                          context: context,
                          builder: (context) => DriverSignupModal(
                            showNotification: _showNotification,
                          ),
                        );
                      },
                      showNotification: _showNotification,
                    ),
                  );
                },
              ),
            IconButton(
              icon: const Icon(Icons.menu, color: Colors.white),
              onPressed: () {},
            ),
          ],
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
                    minZoom: 3.5,
                    maxZoom: 18.0,
                    cameraConstraint: CameraConstraint.contain(
                      bounds: LatLngBounds(
                        const LatLng(-85.05112878, -180.0),
                        const LatLng(85.05112878, 180.0),
                      ),
                    ),
                    interactionOptions: const InteractionOptions(
                      flags: InteractiveFlag.all & ~InteractiveFlag.rotate,
                    ),
                  ),
                  children: [
                    TileLayer(
                      urlTemplate:
                          'https://api.mapbox.com/styles/v1/${dotenv.env['MAPBOX_USERNAME'] ?? 'mapbox'}/${dotenv.env['MAPBOX_STYLE_ID'] ?? 'streets-v12'}/tiles/512/{z}/{x}/{y}@2x?access_token=${dotenv.env['MAPBOX_ACCESS_TOKEN'] ?? ''}',
                      tileDimension: 512,
                      zoomOffset: -1,
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
                        if (!widget.isDriverMode &&
                            _userCurrentLocation != null &&
                            !_userCurrentLocation!.latitude.isNaN &&
                            !_userCurrentLocation!.longitude.isNaN &&
                            !_userCurrentLocation!.latitude.isInfinite &&
                            !_userCurrentLocation!.longitude.isInfinite)
                          Marker(
                            width: 40.0,
                            height: 40.0,
                            point: _userCurrentLocation!,
                            child: GestureDetector(
                              onTap: () {
                                _fetchUserAddress(_userCurrentLocation!);
                              },
                              child: Stack(
                                alignment: Alignment.center,
                                children: [
                                  Icon(
                                    Icons.circle,
                                    color: Colors.blue.withOpacity(0.2),
                                    size: 40,
                                  ),
                                  const Icon(
                                    Icons.circle,
                                    color: Colors.white,
                                    size: 18,
                                  ),
                                  const Icon(
                                    Icons.circle,
                                    color: Colors.blue,
                                    size: 12,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        if (!widget.isDriverMode &&
                            _userCurrentLocation != null &&
                            _showAddressTooltip &&
                            !_userCurrentLocation!.latitude.isNaN &&
                            !_userCurrentLocation!.longitude.isNaN &&
                            !_userCurrentLocation!.latitude.isInfinite &&
                            !_userCurrentLocation!.longitude.isInfinite)
                          Marker(
                            width: 220.0,
                            height: 80.0,
                            point: _userCurrentLocation!,
                            alignment: Alignment.topCenter,
                            child: Stack(
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
                                                _userAddress ?? "Loading address...",
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
                                          onTap: () {
                                            setState(() {
                                              _showAddressTooltip = false;
                                            });
                                          },
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
                      onPressed: () {
                        if (widget.isDriverMode) {
                          if (_driverCurrentLocation != null) {
                            _mapController.move(_driverCurrentLocation!, 14.0);
                          } else {
                            _showNotification(
                              "Your current location is not available.",
                              isError: true,
                            );
                          }
                        } else {
                          if (_userCurrentLocation != null) {
                            _mapController.move(_userCurrentLocation!, 14.0);
                          } else {
                            _enableUserLocation();
                          }
                        }
                      },
                    ),
                  ),
                ),

                // --- BOTTOM-CENTER DYNAMIC CAPSULE PILL OVERLAY ---
                Positioned(
                  bottom: (widget.isDriverMode || _userCurrentLocation == null) ? 90 : 16,
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
                            widget.isDriverMode
                                ? (_isDriverLive
                                    ? "🟢 You are Online & Tracking"
                                    : "${_onlineDriversList.length} Drivers Online Near You")
                                : (_userCurrentLocation == null
                                    ? "${_onlineDriversList.length} Drivers Online"
                                    : "${_nearbyDriversCount.toString().padLeft(2, '0')} Drivers Online Near You"),
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

                // --- DRIVER BOTTOM BAR OVERLAY ---
                if (widget.isDriverMode)
                  Positioned(
                    bottom: 0,
                    left: 0,
                    right: 0,
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      color: AppColors.primaryBlue,
                      child: Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () {
                                showDialog(
                                  context: context,
                                  builder: (context) => DriverSignupModal(
                                    showNotification: _showNotification,
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
                              onPressed: _jwtToken == null
                                  ? () {
                                      showDialog(
                                        context: context,
                                        builder: (context) => DriverLoginModal(
                                          isDriverLive: _isDriverLive,
                                          onLoginSuccess: _handleLoginSuccess,
                                          onPendingApproval: (email) {
                                            _showApprovalGuidanceDialog(email);
                                          },
                                          onSignUpPressed: () {
                                            showDialog(
                                              context: context,
                                              builder: (context) => DriverSignupModal(
                                                showNotification: _showNotification,
                                              ),
                                            );
                                          },
                                          showNotification: _showNotification,
                                        ),
                                      );
                                    }
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
                  )
                // --- USER BOTTOM BAR OVERLAY ---
                else if (_userCurrentLocation == null)
                  Positioned(
                    bottom: 0,
                    left: 0,
                    right: 0,
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      color: AppColors.primaryBlue,
                      child: SizedBox(
                        width: double.infinity,
                        height: 50,
                        child: ElevatedButton.icon(
                          onPressed: _isLocatingUser ? () {} : _enableUserLocation,
                          icon: _isLocatingUser
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : const Icon(Icons.my_location, color: Colors.white),
                          label: Text(
                            _isLocatingUser ? "Locating..." : "Enable Location",
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.successGreen,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            elevation: 2,
                          ),
                        ),
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

class TriangleClipper extends CustomClipper<ui.Path> {
  @override
  ui.Path getClip(Size size) {
    final path = ui.Path();
    path.moveTo(0, 0);
    path.lineTo(size.width, 0);
    path.lineTo(size.width / 2, size.height);
    path.close();
    return path;
  }

  @override
  bool shouldReclip(CustomClipper<ui.Path> oldClipper) => false;
}
