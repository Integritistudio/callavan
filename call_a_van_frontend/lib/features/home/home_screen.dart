import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'dart:ui' as ui;
import 'dart:math' as math;
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart' as geo;
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:cached_network_image/cached_network_image.dart';

import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/app_colors.dart';
import 'welcome_screen.dart';
import 'widgets/radar_animation_marker.dart';
import 'widgets/driver_login_modal.dart';
import 'widgets/driver_signup_modal.dart';
import 'widgets/driver_profile_dialog.dart';
import 'widgets/clippers.dart';
import 'widgets/selected_driver_popup.dart';
import 'widgets/driver_marker.dart';
import 'widgets/user_location_marker.dart';
import 'widgets/user_address_tooltip.dart';
import 'widgets/dialogs.dart';
import 'widgets/status_capsule.dart';
import 'widgets/driver_bottom_bar.dart';

class CachedTileProvider extends TileProvider {
  CachedTileProvider({super.headers});
  @override
  ImageProvider getImage(TileCoordinates coordinates, TileLayer options) {
    return CachedNetworkImageProvider(
      getTileUrl(coordinates, options),
      headers: headers,
    );
  }
}

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

class _HomeScreenState extends State<HomeScreen> with TickerProviderStateMixin {
  final Map<int, AnimationController> _markerAnimations = {};
  AnimationController? _ownLocationController;

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
  Map<String, dynamic>? _selectedDriver;
  String? _selectedDriverAddress;
  bool _isFetchingSelectedDriverAddress = false;
  OverlayEntry? _currentNotificationOverlay;
  Timer? _notificationTimer;
  final MapController _mapController = MapController();

  Future<void> _loadLastLocation() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final double? lastLat = prefs.getDouble('last_driver_lat');
      final double? lastLng = prefs.getDouble('last_driver_lng');
      if (lastLat != null &&
          lastLng != null &&
          !lastLat.isNaN &&
          !lastLng.isNaN) {
        if (mounted) {
          setState(() {
            _driverCurrentLocation = LatLng(lastLat, lastLng);
          });
          // Wait briefly for mapController to be fully bound/ready
          Future.delayed(const Duration(milliseconds: 200), () {
            if (mounted) {
              _mapController.move(LatLng(lastLat, lastLng), 14.0);
            }
          });
        }
      }
    } catch (e) {
      print("Error loading last driver location: $e");
    }
  }

  void _animateDriverMarker(
    int driverId,
    double newLat,
    double newLng,
    bool isLive,
  ) {
    final index = _onlineDriversList.indexWhere((d) => d['id'] == driverId);
    if (index == -1) {
      _fetchLiveDriversInitial();
      return;
    }

    final double oldLat =
        double.tryParse(
          _onlineDriversList[index]['latitude']?.toString() ?? '',
        ) ??
        newLat;
    final double oldLng =
        double.tryParse(
          _onlineDriversList[index]['longitude']?.toString() ?? '',
        ) ??
        newLng;

    _markerAnimations[driverId]?.dispose();

    final controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    );
    _markerAnimations[driverId] = controller;

    final animation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(parent: controller, curve: Curves.easeInOut));

    animation.addListener(() {
      if (mounted) {
        setState(() {
          double currentLat = oldLat + (newLat - oldLat) * animation.value;
          double currentLng = oldLng + (newLng - oldLng) * animation.value;

          final idx = _onlineDriversList.indexWhere((d) => d['id'] == driverId);
          if (idx != -1) {
            _onlineDriversList[idx]['latitude'] = currentLat;
            _onlineDriversList[idx]['longitude'] = currentLng;
            _onlineDriversList[idx]['isLive'] = isLive;
          }

          if (_selectedDriver != null && _selectedDriver!['id'] == driverId) {
            _selectedDriver!['latitude'] = currentLat;
            _selectedDriver!['longitude'] = currentLng;
          }
        });
      }
    });

    controller.forward().then((_) {
      controller.dispose();
      if (_markerAnimations[driverId] == controller) {
        _markerAnimations.remove(driverId);
      }
    });
  }

  void _animateOwnLocation(double newLat, double newLng) {
    final double oldLat = _driverCurrentLocation?.latitude ?? newLat;
    final double oldLng = _driverCurrentLocation?.longitude ?? newLng;

    _ownLocationController?.dispose();
    _ownLocationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    );

    final animation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _ownLocationController!, curve: Curves.easeInOut),
    );

    animation.addListener(() {
      if (mounted) {
        setState(() {
          double currentLat = oldLat + (newLat - oldLat) * animation.value;
          double currentLng = oldLng + (newLng - oldLng) * animation.value;
          _driverCurrentLocation = LatLng(currentLat, currentLng);
        });
      }
    });

    _ownLocationController!.forward();
  }

  @override
  void initState() {
    super.initState();
    _jwtToken = widget.initialToken;
    _loggedInDriver = widget.initialDriver;
    _fetchLiveDriversInitial();
    // Registered status listeners to track background updates
    _registerLocationServiceStatusListener();
    _initializeWebSocketStream();
    _loadLastLocation();
    
    // Auto-detect and start location for customer if already permitted
    _autoDetectCustomerLocation();

    // Auto-resume live tracking if the driver was live before the app was minimized/closed
    if (widget.isDriverMode && _jwtToken != null) {
      SharedPreferences.getInstance().then((prefs) {
        final wasLive = prefs.getBool('is_driver_live') ?? false;
        if (wasLive) {
          _toggleLiveStatus(true);
        }
      });
    }
  }

  @override
  void dispose() {
    _ownLocationController?.dispose();
    for (var controller in _markerAnimations.values) {
      controller.dispose();
    }
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
          top: 100.0, // Below header
          right: 16.0, // Aligned to the right side
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
              child: SizedBox(
                width: 300, // Compact width
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 14,
                  ),
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
                        isError
                            ? Icons.error_outline
                            : Icons.check_circle_outline,
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
          ),
        );
      },
    );

    // 3. Mount in the application Overlay Stack (shows on top of dialogs/modals)
    if (mounted) {
      Overlay.of(context).insert(_currentNotificationOverlay!);
    }

    // 4. Auto-dismiss timeout
    _notificationTimer = Timer(const Duration(seconds: 3), () {
      if (_currentNotificationOverlay != null) {
        try {
          _currentNotificationOverlay!.remove();
        } catch (_) {}
        _currentNotificationOverlay = null;
      }
    });
  }

  int get _nearbyDriversCount {
    final liveDrivers = _onlineDriversList.where(
      (d) => d['isLive'] == true || d['isLive'] == 1 || d['isLive'] == 'true',
    );
    if (_userCurrentLocation == null) return liveDrivers.length;
    int count = 0;
    for (var driver in liveDrivers) {
      final double? lat = double.tryParse(driver['latitude']?.toString() ?? '');
      final double? lng = double.tryParse(
        driver['longitude']?.toString() ?? '',
      );
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

    // Geocoding is not supported on Flutter Web
    if (kIsWeb) {
      if (mounted) {
        setState(() {
          _userAddress =
              "${coordinates.latitude.toStringAsFixed(4)}, ${coordinates.longitude.toStringAsFixed(4)}";
          _isFetchingAddress = false;
        });
      }
      return;
    }

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
        if (street.isNotEmpty && street != name)
          parts.add(street);
        else if (name.isNotEmpty)
          parts.add(name);
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
            _userAddress =
                "Coordinates: ${coordinates.latitude.toStringAsFixed(4)}, ${coordinates.longitude.toStringAsFixed(4)}";
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _userAddress =
              "${coordinates.latitude.toStringAsFixed(4)}, ${coordinates.longitude.toStringAsFixed(4)}";
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

  Future<void> _selectDriver(Map<String, dynamic> driver) async {
    setState(() {
      _selectedDriver = driver;
      _selectedDriverAddress = "Loading address...";
      _isFetchingSelectedDriverAddress = true;
    });

    final double? lat = double.tryParse(driver['latitude']?.toString() ?? '');
    final double? lng = double.tryParse(driver['longitude']?.toString() ?? '');

    // Drivers with no location yet (never went live)
    if (lat == null || lng == null || lat.isNaN || lng.isNaN) {
      if (mounted) {
        setState(() {
          _selectedDriverAddress = "Location not available yet";
          _isFetchingSelectedDriverAddress = false;
        });
      }
      return;
    }

    // Geocoding is not supported on Flutter Web — skip and show coordinates
    if (kIsWeb) {
      if (mounted) {
        setState(() {
          _selectedDriverAddress =
              "${lat.toStringAsFixed(4)}, ${lng.toStringAsFixed(4)}";
          _isFetchingSelectedDriverAddress = false;
        });
      }
      return;
    }

    try {
      final placemarks = await geo.placemarkFromCoordinates(lat, lng);
      if (placemarks.isNotEmpty) {
        final p = placemarks.first;
        final street = p.street ?? '';
        final subLocality = p.subLocality ?? '';
        final locality = p.locality ?? '';
        List<String> parts = [];
        if (street.isNotEmpty) parts.add(street);
        if (subLocality.isNotEmpty) parts.add(subLocality);
        if (locality.isNotEmpty) parts.add(locality);
        if (mounted) {
          setState(() {
            _selectedDriverAddress = parts.isNotEmpty
                ? parts.join(', ')
                : "${lat.toStringAsFixed(4)}, ${lng.toStringAsFixed(4)}";
          });
        }
      } else {
        if (mounted) {
          setState(() {
            _selectedDriverAddress =
                "${lat.toStringAsFixed(4)}, ${lng.toStringAsFixed(4)}";
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _selectedDriverAddress =
              "${lat.toStringAsFixed(4)}, ${lng.toStringAsFixed(4)}";
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isFetchingSelectedDriverAddress = false;
        });
      }
    }
  }

  Future<void> _makePhoneCall(String phoneNumber) async {
    if (phoneNumber.isEmpty || phoneNumber == 'N/A') {
      _showNotification(
        "No phone number available for this driver.",
        isError: true,
      );
      return;
    }

    try {
      await Clipboard.setData(ClipboardData(text: phoneNumber));
    } catch (e) {
      print("Clipboard copy error: $e");
    }

    final Uri launchUri = Uri(scheme: 'tel', path: phoneNumber);

    try {
      final bool launched = await launchUrl(
        launchUri,
        mode: LaunchMode.externalApplication,
      );
      if (launched) {
        _showNotification("Opening dialer & copied phone number to clipboard.");
      } else {
        _showNotification("Phone number copied to clipboard: $phoneNumber");
      }
    } catch (e) {
      _showNotification("Phone number copied to clipboard: $phoneNumber");
    }
  }

  Marker _buildSelectedDriverPopupMarker() {
    return SelectedDriverPopupMarker(
      driver: _selectedDriver!,
      address: _selectedDriverAddress,
      mapController: _mapController,
      isDriverMode: widget.isDriverMode,
      context: context,
      onClose: () {
        setState(() {
          _selectedDriver = null;
        });
      },
      onCall: _makePhoneCall,
      getCorrectImageUrl: _getCorrectImageUrl,
    );
  }

  Future<void> _enableUserLocation() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      final confirm = await _showLocationPermissionExplanationDialog(
        isHardwareDisabled: true,
      );
      if (!confirm) return;

      if (!kIsWeb) {
        await Geolocator.openLocationSettings();
      }
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
      if (!kIsWeb) {
        await Geolocator.openAppSettings();
      }
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
        forceAndroidLocationManager: true,
      );
      if (mounted) {
        setState(() {
          _userCurrentLocation = LatLng(position.latitude, position.longitude);
        });
        _mapController.move(_userCurrentLocation!, 14.0);
      }

      // Subscribe to live updates so position moves with the user
      _userLocationSubscription =
          Geolocator.getPositionStream(
            locationSettings: const LocationSettings(
              accuracy: LocationAccuracy.high, // 'high' prevents the Wi-Fi popup while keeping great precision
              distanceFilter: 1, // Still perfectly tracking 1-meter steps!
            ),
          ).listen(
            (Position pos) {
              final lat = pos.latitude;
              final lng = pos.longitude;
              if (lat.isNaN || lng.isNaN || lat.isInfinite || lng.isInfinite)
                return;

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
      _showNotification(
        "Failed to fetch your current location.",
        isError: true,
      );
    } finally {
      if (mounted) {
        setState(() {
          _isLocatingUser = false;
        });
      }
    }
  }

  // --- AUTO DETECT CUSTOMER LOCATION ---
  Future<void> _autoDetectCustomerLocation() async {
    if (widget.isDriverMode) return;
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return;
    
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.whileInUse || permission == LocationPermission.always) {
      _enableUserLocationSilently();
    }
  }

  Future<void> _enableUserLocationSilently() async {
    if (mounted) setState(() => _isLocatingUser = true);
    try {
      await _userLocationSubscription?.cancel();
      
      final Position position = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high, forceAndroidLocationManager: true);
      if (mounted) {
        setState(() {
          _userCurrentLocation = LatLng(position.latitude, position.longitude);
        });
        _mapController.move(_userCurrentLocation!, 14.0);
      }

      _userLocationSubscription = Geolocator.getPositionStream(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high, distanceFilter: 1),
      ).listen((Position pos) {
        if (mounted) {
          setState(() {
            _userCurrentLocation = LatLng(pos.latitude, pos.longitude);
          });
        }
      });
    } catch (e) {
      print("Auto-location failed: $e");
    } finally {
      if (mounted) setState(() => _isLocatingUser = false);
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
            // Allow polling fallback so phone (USB/ADB) connects reliably
            .setTransports(['websocket', 'polling'])
            .enableAutoConnect()
            .enableReconnection()
            .setReconnectionAttempts(5)
            .setReconnectionDelay(2000)
            .build(),
      );

      _socket?.onConnect((_) {
        print(
          "🔌 [WebSocket] Connected successfully with session ID: ${_socket?.id}",
        );
        // Automatically announce live state if we are a driver and live
        if (widget.isDriverMode &&
            _isDriverLive &&
            _loggedInDriver?['id'] != null) {
          _socket?.emit('go_live', {'driverId': _loggedInDriver?['id']});
        }
      });

      _socket?.onConnectError((err) {
        print("❌ [WebSocket] Connection error: $err");
      });

      _socket?.onDisconnect((reason) {
        print("❌ [WebSocket] Connection lost with backend. Reason: $reason");
      });

      // Listen for moving driver coordinate changes
      _socket?.on('driver_location_changed', (data) {
        if (mounted) {
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

          _animateDriverMarker(driverId, lat, lng, data['isLive'] ?? true);
        }
      });

      // Listen for driver status changes (toggle online/offline)
      _socket?.on('driver_status_changed', (data) {
        if (mounted) {
          setState(() {
            final int driverId = data['driverId'];
            final bool isLive = data['isLive'] ?? false;
            final index = _onlineDriversList.indexWhere(
              (d) => d['id'] == driverId,
            );
            if (index != -1) {
              _onlineDriversList[index]['isLive'] = isLive;
              // If this is the currently selected driver, update their status live on the popup card as well
              if (_selectedDriver != null &&
                  _selectedDriver!['id'] == driverId) {
                _selectedDriver!['isLive'] = isLive;
              }
            } else {
              _fetchLiveDriversInitial();
            }
          });
        }
      });

      // Listen for driver logging out completely (remove from map)
      _socket?.on('driver_logged_out', (data) {
        if (mounted) {
          setState(() {
            final int driverId = data['driverId'];
            _onlineDriversList.removeWhere((d) => d['id'] == driverId);
            if (_selectedDriver != null && _selectedDriver!['id'] == driverId) {
              _selectedDriver = null;
            }
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
    return HomeDialogs.showLocationPermissionExplanation(
      context,
      isHardwareDisabled: isHardwareDisabled,
    );
  }

  // --- BACKGROUND SERVICE TOGGLE MONITOR ---
  void _registerLocationServiceStatusListener() {
    if (kIsWeb) return;
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
      } else if (status == ServiceStatus.enabled) {
        if (!widget.isDriverMode) {
          _autoDetectCustomerLocation();
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

      if (mounted) {
        setState(() {
          _isDriverLive = true;
        });
      }
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool('is_driver_live', true);

      // Emit status update instantly to socket if already connected
      if (_socket != null &&
          _socket!.connected &&
          _loggedInDriver?['id'] != null) {
        _socket!.emit('go_live', {'driverId': _loggedInDriver?['id']});
      }

      // Fetch and broadcast initial location asynchronously (non-blocking) to show online immediately
      Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high, forceAndroidLocationManager: true)
          .then((position) {
            final lat = position.latitude;
            final lng = position.longitude;
            if (!lat.isNaN &&
                !lng.isNaN &&
                !lat.isInfinite &&
                !lng.isInfinite) {
              if (mounted) {
                _animateOwnLocation(lat, lng);
                _mapController.move(LatLng(lat, lng), 14.5);
              }
              if (_socket != null && _socket!.connected) {
                _socket!.emit('update_location', {
                  'driverId': _loggedInDriver?['id'],
                  'latitude': lat,
                  'longitude': lng,
                });
              }
              SharedPreferences.getInstance()
                  .then((prefs) {
                    prefs.setDouble('last_driver_lat', lat);
                    prefs.setDouble('last_driver_lng', lng);
                  })
                  .catchError((_) {});
            }
          })
          .catchError((e) {
            print("❌ [GPS] Initial location fetch failed: $e");
          });

      // 4. Subscribe to high-accuracy location tracking with Foreground Service
      _gpsSubscription?.cancel();

      late LocationSettings locationSettings;
      if (defaultTargetPlatform == TargetPlatform.android) {
        locationSettings = AndroidSettings(
          accuracy: LocationAccuracy.high, // 'high' prevents Wi-Fi popup
          distanceFilter: 1, // Retains beautiful 1-meter tracking
          forceLocationManager: true,
          foregroundNotificationConfig: const ForegroundNotificationConfig(
            notificationText: "You are currently visible to customers.",
            notificationTitle: "Call A Van - Online 🟢",
            enableWakeLock: true,
          ),
        );
      } else if (defaultTargetPlatform == TargetPlatform.iOS) {
        locationSettings = AppleSettings(
          accuracy: LocationAccuracy.high,
          activityType: ActivityType.automotiveNavigation,
          distanceFilter: 1,
          pauseLocationUpdatesAutomatically: false,
          showBackgroundLocationIndicator: true,
        );
      } else {
        locationSettings = const LocationSettings(
          accuracy: LocationAccuracy.high,
          distanceFilter: 1,
        );
      }

      _gpsSubscription =
          Geolocator.getPositionStream(
            locationSettings: locationSettings,
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
                _animateOwnLocation(lat, lng);
                setState(() {
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
              SharedPreferences.getInstance()
                  .then((prefs) {
                    prefs.setDouble('last_driver_lat', lat);
                    prefs.setDouble('last_driver_lng', lng);
                  })
                  .catchError((_) {});
            },
            onError: (err) {
              print("❌ [GPS] Location stream error: $err");
            },
          );

      setState(() {
        _isDriverLive = true;
      });

      _showNotification(
        "You are now LIVE on the map! Moving physical updates will update your coordinates.",
      );
    } else {
      // Clean up GPS tracking safely by awaiting cancellation to destroy Android Foreground Service
      if (_gpsSubscription != null) {
        await _gpsSubscription!.cancel();
        _gpsSubscription = null;
      }

      // --- INDUSTRY TRICK: Force Android to drop the stuck notification ---
      if (defaultTargetPlatform == TargetPlatform.android) {
        try {
          // We start a quick fake stream without foreground settings, then instantly kill it.
          // This overwrites the system's memory and deletes the un-swipeable notification.
          final dummyStream = Geolocator.getPositionStream(
            locationSettings: AndroidSettings(
              accuracy: LocationAccuracy.lowest,
              distanceFilter: 100,
            ),
          ).listen((_) {});

          await Future.delayed(const Duration(milliseconds: 150));
          await dummyStream.cancel();
        } catch (e) {
          print("Notification removal trick error: $e");
        }
      }
      // --------------------------------------------------------------------

      if (_serviceStatusSubscription != null) {
        await _serviceStatusSubscription!.cancel();
        _serviceStatusSubscription = null;
      }

      if (_socket != null && _socket!.connected) {
        _socket!.emit('go_offline', {'driverId': _loggedInDriver?['id']});
      }

      setState(() {
        _isDriverLive = false;
      });
      SharedPreferences.getInstance().then((prefs) {
        prefs.setBool('is_driver_live', false);
      });

      _showNotification(
        "You went Offline. Location sharing has been safely terminated.",
        isError: false,
      );
    }
  }

  // --- INFO DIALOG: SHOW HOW TO APPROVE ---
  void _showApprovalGuidanceDialog(String email) {
    HomeDialogs.showApprovalGuidance(context);
  }

  void _showDriverLogoutRequiredDialog() {
    HomeDialogs.showDriverLogoutRequired(context, onConfirm: _logoutDriver);
  }

  String _getCorrectImageUrl(String? rawUrl) {
    if (rawUrl == null || rawUrl.isEmpty) return '';
    final backendUrl = dotenv.env['BACKEND_URL'] ?? 'http://10.0.2.2:5000';
    String backendAuthority = Uri.parse(backendUrl).authority;
    if (backendAuthority.isEmpty) {
      backendAuthority = backendUrl
          .replaceAll('http://', '')
          .replaceAll('https://', '');
    }
    if (rawUrl.startsWith('http')) {
      return rawUrl
          .replaceAll('localhost:5000', backendAuthority)
          .replaceAll('127.0.0.1:5000', backendAuthority);
    } else {
      return '$backendUrl$rawUrl';
    }
  }

  Future<void> _handleLoginSuccess(
    String token,
    Map<String, dynamic> driver,
  ) async {
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

    // 2. Call backend logout endpoint to clear session and remove driver from map
    if (_jwtToken != null) {
      try {
        final backendUrl = dotenv.env['BACKEND_URL'] ?? 'http://10.0.2.2:5000';
        await http.post(
          Uri.parse('$backendUrl/api/drivers/logout'),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $_jwtToken',
          },
        );
      } catch (e) {
        print("Backend logout failed: $e");
      }
    }

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
      // User explicitly requested to redirect to WelcomeScreen on logout
      _navigateBackToWelcome();
    }
  }

  void _navigateBackToWelcome() {
    Navigator.of(context).pushAndRemoveUntil(
      PageRouteBuilder(
        pageBuilder: (context, animation, secondaryAnimation) =>
            const WelcomeScreen(),
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          const begin = Offset(-0.15, 0.0); // Subtle, elegant slide back
          const end = Offset.zero;
          const curve = Curves.easeOutCubic;

          var tween = Tween(
            begin: begin,
            end: end,
          ).chain(CurveTween(curve: curve));

          return SlideTransition(
            position: animation.drive(tween),
            child: FadeTransition(opacity: animation, child: child),
          );
        },
        transitionDuration: const Duration(
          milliseconds: 350,
        ), // Smooth 350ms duration
      ),
      (route) => false,
    );
  }

  String _getHeaderTitle() {
    if (widget.isDriverMode) {
      if (_loggedInDriver != null) {
        return _isDriverLive ? 'You are Live on the Map' : 'You are Currently Offline';
      }
      return 'Join the Driver Network';
    }
    return 'See Who is Live Near You';
  }

  String _getHeaderSubtitle() {
    if (widget.isDriverMode) {
      if (_loggedInDriver != null) {
        return _isDriverLive
            ? 'Customers and other drivers can see you.'
            : 'Turn on your location to become visible.';
      }
      return 'Log in to securely broadcast your live location.';
    }
    return 'Local drivers. Real-time availability. Call directly.';
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false, // Never pop immediately
      onPopInvoked: (didPop) async {
        if (didPop) return;

        if (_jwtToken != null) {
          // Logged-in driver -> Show confirmation dialog
          final shouldExit = await showDialog<bool>(
            context: context,
            builder: (context) => AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              title: const Text("Exit CallAVAN", style: TextStyle(fontWeight: FontWeight.bold)),
              content: const Text("Do you really want to exit the app?"),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(false),
                  child: Text("No", style: TextStyle(color: Colors.grey[700], fontWeight: FontWeight.bold)),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.redAccent,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  onPressed: () => Navigator.of(context).pop(true),
                  child: const Text("Yes", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          );

          if (shouldExit == true) {
            SystemNavigator.pop(); // Safely close the app
          }
        } else {
          // Customers or guests -> just slide back to Welcome Screen
          _navigateBackToWelcome();
        }
      },
      child: Scaffold(
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
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
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
                        backgroundImage:
                            _loggedInDriver?['profileImageUrl'] != null
                            ? NetworkImage(
                                _getCorrectImageUrl(
                                  _loggedInDriver!['profileImageUrl'],
                                ),
                              )
                            : null,
                        child: _loggedInDriver?['profileImageUrl'] == null
                            ? const Icon(
                                Icons.person,
                                color: Colors.white,
                                size: 20,
                              )
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
                icon: const Icon(Icons.home_rounded, color: Colors.white),
                tooltip: "Back to Home",
                onPressed: () {
                  if (_jwtToken != null) {
                    _showDriverLogoutRequiredDialog();
                  } else {
                    _navigateBackToWelcome();
                  }
                },
              ),
            ] else ...[
              IconButton(
                icon: const Icon(Icons.home_rounded, color: Colors.white),
                tooltip: "Back to Home",
                onPressed: () {
                  _navigateBackToWelcome();
                },
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
              child: Column(
                children: [
                  Text(
                    _getHeaderTitle(),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 5),
                  Text(
                    _getHeaderSubtitle(),
                    style: const TextStyle(color: Colors.white70, fontSize: 12),
                  ),
                ],
              ),
            ),
            Expanded(
              child: Stack(
                children: [
                  // --- MAPBOX MAP CANVAS (WITH INDUSTRY-GRADE PERFORMANCE TRICKS) ---
                  Container(
                    color: const Color(0xFFF0EEE9), // Soft Mapbox beige camouflage background
                    child: FlutterMap(
                      mapController: _mapController,
                      options: MapOptions(
                        backgroundColor: const Color(0xFFF0EEE9),
                        initialCenter: const LatLng(51.5074, -0.1278), // London
                        initialZoom: 13.0,
                        minZoom: 3.0, // Allows seeing the whole world view
                        maxZoom: 18.0, // Increased to allow deep zoom without breaking
                      onTap: (tapPosition, point) {
                        setState(() {
                          _selectedDriver = null;
                          _showAddressTooltip = false;
                        });
                      },
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
                        maxNativeZoom: 19, // Forces digital stretching of previous tiles instantly
                        maxZoom: 22.0, // Match the MapOptions max zoom
                        keepBuffer: 3, 
                        panBuffer: 1, 
                        // Removed retinaMode because Mapbox @2x natively handles high-res perfectly
                        tileProvider: NetworkTileProvider(
                          headers: {'User-Agent': 'com.example.call_a_van'},
                        ), // NetworkTileProvider is 100x faster than disk cache for immediate loading
                        userAgentPackageName: 'com.example.call_a_van',
                      ),
                      MarkerLayer(
                        markers: [
                          // Draw all other active live drivers
                          ..._onlineDriversList
                              .where(
                                (driver) =>
                                    driver['id'] != _loggedInDriver?['id'],
                              )
                              .map((driver) {
                                try {
                                  return DriverMarker(
                                    driver: driver,
                                    onTap: () => _selectDriver(driver),
                                    isOrange: widget.isDriverMode,
                                  );
                                } catch (_) {
                                  return const Marker(
                                    width: 0,
                                    height: 0,
                                    point: LatLng(0, 0),
                                    child: SizedBox.shrink(),
                                  );
                                }
                              }),

                          // Render our distinct personal radar pulse green ring when live
                          if (_isDriverLive &&
                              _driverCurrentLocation != null &&
                              !_driverCurrentLocation!.latitude.isNaN &&
                              !_driverCurrentLocation!.longitude.isNaN &&
                              !_driverCurrentLocation!.latitude.isInfinite &&
                              !_driverCurrentLocation!.longitude.isInfinite)
                            Marker(
                              width: 90.0,
                              height: 90.0,
                              point: _driverCurrentLocation!,
                              child: const LiveRadarMarker(
                                isOrange: false,
                              ), // Always green for own live driver
                            )
                          else if (!_isDriverLive &&
                              _loggedInDriver != null &&
                              _driverCurrentLocation != null &&
                              !_driverCurrentLocation!.latitude.isNaN &&
                              !_driverCurrentLocation!.longitude.isNaN &&
                              !_driverCurrentLocation!.latitude.isInfinite &&
                              !_driverCurrentLocation!.longitude.isInfinite)
                            // Render our last known offline position as a generic grey marker pin!
                            Marker(
                              width: 60.0,
                              height: 60.0,
                              point: _driverCurrentLocation!,
                              child: const Stack(
                                alignment: Alignment.center,
                                children: [
                                  Icon(
                                    Icons.circle,
                                    color: Colors.black26,
                                    size: 44,
                                  ),
                                  Icon(
                                    Icons.circle,
                                    color: Colors.white,
                                    size: 30,
                                  ),
                                  Icon(
                                    Icons.circle,
                                    color: Colors.grey,
                                    size: 18,
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
                              child: UserLocationMarkerWidget(
                                onTap: () {
                                  _fetchUserAddress(_userCurrentLocation!);
                                },
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
                              child: UserAddressTooltip(
                                address: _userAddress ?? "Loading address...",
                                onClose: () {
                                  setState(() {
                                    _showAddressTooltip = false;
                                  });
                                },
                              ),
                            ),
                          if (_selectedDriver != null)
                            _buildSelectedDriverPopupMarker(),
                        ],
                      ),
                    ],
                  ),
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
                              _mapController.move(
                                _driverCurrentLocation!,
                                14.0,
                              );
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
                  if (_selectedDriver == null)
                    Positioned(
                      bottom:
                          (widget.isDriverMode || _userCurrentLocation == null)
                          ? 90
                          : 16,
                      left: 0,
                      right: 0,
                      child: Center(
                        child: StatusCapsule(
                          isDriverMode: widget.isDriverMode,
                          isDriverLive: _isDriverLive,
                          onlineDriversList: _onlineDriversList,
                        ),
                      ),
                    ),

                  // --- DRIVER BOTTOM BAR ---
                  if (widget.isDriverMode)
                    Positioned(
                      bottom: 0,
                      left: 0,
                      right: 0,
                      child: DriverBottomBar(
                        jwtToken: _jwtToken,
                        isDriverLive: _isDriverLive,
                        onLoginSuccess: _handleLoginSuccess,
                        onPendingApproval: _showApprovalGuidanceDialog,
                        showNotification: _showNotification,
                        onToggleLiveStatus: _toggleLiveStatus,
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
                            onPressed: _isLocatingUser
                                ? () {}
                                : _enableUserLocation,
                            icon: _isLocatingUser
                                ? const SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  )
                                : const Icon(
                                    Icons.my_location,
                                    color: Colors.white,
                                  ),
                            label: Text(
                              _isLocatingUser
                                  ? "Locating..."
                                  : "Enable Location",
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
      ),
    );
  }
}
