import '../../domain/entities/discovery_user.dart';
import '../../domain/repositories/discovery_repository.dart';
import '../datasources/discovery_remote_datasource.dart';
import 'dart:math' as math;

class DiscoveryRepositoryImpl implements DiscoveryRepository {
  final DiscoveryRemoteDataSource _remoteDataSource;

  DiscoveryRepositoryImpl({
    required DiscoveryRemoteDataSource remoteDataSource,
  }) : _remoteDataSource = remoteDataSource;

  @override
  Future<List<DiscoveryUser>> searchUsers({
    String? query,
    double? latitude,
    double? longitude,
    double? radius,
    int? limit,
  }) async {
    try {
      final users = await _remoteDataSource.searchUsers(
        query: query,
        latitude: latitude,
        longitude: longitude,
        radius: radius,
        limit: limit,
      );

      // Calculate distances if user location is provided
      if (latitude != null && longitude != null) {
        return users.map((user) {
          final distance = _calculateDistance(
            latitude,
            longitude,
            user.latitude,
            user.longitude,
          );
          return DiscoveryUser(
            id: user.id,
            fullName: user.fullName,
            userType: user.userType,
            rank: user.rank,
            shipName: user.shipName,
            imoNumber: user.imoNumber,
            port: user.port,
            city: user.city,
            country: user.country,
            latitude: user.latitude,
            longitude: user.longitude,
            deviceLatitude: user.deviceLatitude,
            deviceLongitude: user.deviceLongitude,
            locationSource: user.locationSource,
            locationUpdatedAt: user.locationUpdatedAt,
            isVerified: user.isVerified,
            questionCount: user.questionCount,
            answerCount: user.answerCount,
            whatsAppProfilePictureUrl: user.whatsAppProfilePictureUrl,
            whatsAppDisplayName: user.whatsAppDisplayName,
            distance: distance,
          );
        }).toList();
      }

      return users;
    } catch (e) {
      throw Exception('Failed to search users: $e');
    }
  }

  @override
  Future<void> updateLocation({
    required double latitude,
    required double longitude,
  }) async {
    try {
      await _remoteDataSource.updateLocation(
        latitude: latitude,
        longitude: longitude,
      );
    } catch (e) {
      throw Exception('Failed to update location: $e');
    }
  }

  @override
  Future<List<DiscoveryUser>> getNearbyUsers({
    required double latitude,
    required double longitude,
    double radius = 50.0,
    int limit = 10,
  }) async {
    try {
      final users = await searchUsers(
        latitude: latitude,
        longitude: longitude,
        radius: radius,
        limit: limit,
      );

      // Sort by distance
      users.sort((a, b) {
        final distA = a.distance ?? double.infinity;
        final distB = b.distance ?? double.infinity;
        return distA.compareTo(distB);
      });

      return users;
    } catch (e) {
      throw Exception('Failed to get nearby users: $e');
    }
  }

  // Calculate distance between two points using Haversine formula
  double _calculateDistance(double lat1, double lon1, double lat2, double lon2) {
    const double earthRadius = 6371; // Earth's radius in kilometers

    double dLat = _degreesToRadians(lat2 - lat1);
    double dLon = _degreesToRadians(lon2 - lon1);

    double a = math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(_degreesToRadians(lat1)) *
            math.cos(_degreesToRadians(lat2)) *
            math.sin(dLon / 2) *
            math.sin(dLon / 2);

    double c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
    return earthRadius * c;
  }

  double _degreesToRadians(double degrees) {
    return degrees * (math.pi / 180);
  }
}