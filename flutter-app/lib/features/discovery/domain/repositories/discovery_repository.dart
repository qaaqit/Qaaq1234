import '../entities/discovery_user.dart';

abstract class DiscoveryRepository {
  Future<List<DiscoveryUser>> searchUsers({
    String? query,
    double? latitude,
    double? longitude,
    double? radius,
    int? limit,
  });
  
  Future<void> updateLocation({
    required double latitude,
    required double longitude,
  });
  
  Future<List<DiscoveryUser>> getNearbyUsers({
    required double latitude,
    required double longitude,
    double radius = 50.0,
    int limit = 10,
  });
}