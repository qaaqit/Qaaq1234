import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../bloc/discovery_bloc.dart';
import '../widgets/discovery_map.dart';
import '../widgets/discovery_search_bar.dart';
import '../widgets/user_list_sheet.dart';
import '../../../../core/config/app_config.dart';
import '../../../../core/utils/logger.dart';

class DiscoveryPage extends StatefulWidget {
  const DiscoveryPage({super.key});

  @override
  State<DiscoveryPage> createState() => _DiscoveryPageState();
}

class _DiscoveryPageState extends State<DiscoveryPage> {
  Position? _currentPosition;
  bool _isLoadingLocation = false;
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _requestLocationPermission();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _requestLocationPermission() async {
    try {
      final permission = await Permission.location.request();
      
      if (permission.isGranted) {
        await _getCurrentLocation();
      } else {
        AppLogger.warning('Location permission denied');
      }
    } catch (e) {
      AppLogger.error('Error requesting location permission', e);
    }
  }

  Future<void> _getCurrentLocation() async {
    if (_isLoadingLocation) return;
    
    setState(() {
      _isLoadingLocation = true;
    });

    try {
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      
      setState(() {
        _currentPosition = position;
      });

      // Update location on server
      context.read<DiscoveryBloc>().add(
        UpdateLocation(
          latitude: position.latitude,
          longitude: position.longitude,
        ),
      );

      AppLogger.info('Current location: ${position.latitude}, ${position.longitude}');
    } catch (e) {
      AppLogger.error('Error getting current location', e);
    } finally {
      setState(() {
        _isLoadingLocation = false;
      });
    }
  }

  void _onKoiHaiPressed() {
    if (_currentPosition != null) {
      context.read<DiscoveryBloc>().add(
        GetNearbyUsers(
          latitude: _currentPosition!.latitude,
          longitude: _currentPosition!.longitude,
          radius: AppConfig.searchRadius,
          limit: 10,
        ),
      );
    } else {
      // Search without location
      context.read<DiscoveryBloc>().add(
        const SearchUsers(limit: 10),
      );
    }
  }

  void _onSearchChanged(String query) {
    if (query.trim().isEmpty) {
      context.read<DiscoveryBloc>().add(ClearSearch());
      return;
    }

    context.read<DiscoveryBloc>().add(
      SearchUsers(
        query: query,
        latitude: _currentPosition?.latitude,
        longitude: _currentPosition?.longitude,
        radius: AppConfig.searchRadius,
        limit: 100,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // Map
          DiscoveryMap(
            currentPosition: _currentPosition,
          ),
          
          // Top search bar
          Positioned(
            top: MediaQuery.of(context).padding.top + 16,
            left: 16,
            right: 16,
            child: DiscoverySearchBar(
              controller: _searchController,
              onChanged: _onSearchChanged,
              onLocationPressed: _getCurrentLocation,
              isLoadingLocation: _isLoadingLocation,
            ),
          ),
          
          // "Koi Hai?" button
          Positioned(
            bottom: MediaQuery.of(context).padding.bottom + 100,
            left: 0,
            right: 0,
            child: Center(
              child: BlocBuilder<DiscoveryBloc, DiscoveryState>(
                builder: (context, state) {
                  final isLoading = state is DiscoveryLoading;
                  
                  return FloatingActionButton.extended(
                    onPressed: isLoading ? null : _onKoiHaiPressed,
                    backgroundColor: Theme.of(context).colorScheme.primary,
                    foregroundColor: Colors.white,
                    elevation: 8,
                    icon: isLoading 
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Icon(LucideIcons.compass),
                    label: Text(
                      isLoading ? 'Searching...' : 'Koi Hai?',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
          
          // User list sheet
          const UserListSheet(),
        ],
      ),
    );
  }
}