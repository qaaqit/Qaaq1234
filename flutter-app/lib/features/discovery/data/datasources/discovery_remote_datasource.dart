import 'package:dio/dio.dart';
import '../../../../core/network/dio_client.dart';
import '../../../../core/config/app_config.dart';
import '../models/discovery_user_model.dart';

class DiscoveryRemoteDataSource {
  final DioClient _dioClient;

  DiscoveryRemoteDataSource(this._dioClient);

  Future<List<DiscoveryUserModel>> searchUsers({
    String? query,
    double? latitude,
    double? longitude,
    double? radius,
    int? limit,
  }) async {
    try {
      final queryParams = <String, dynamic>{};
      
      if (query != null && query.isNotEmpty) {
        queryParams['q'] = query;
      }
      if (latitude != null) {
        queryParams['lat'] = latitude;
      }
      if (longitude != null) {
        queryParams['lng'] = longitude;
      }
      if (radius != null) {
        queryParams['radius'] = radius;
      }
      if (limit != null) {
        queryParams['limit'] = limit;
      }

      final response = await _dioClient.get(
        AppConfig.usersSearchEndpoint,
        queryParameters: queryParams,
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = response.data;
        return data.map((json) => DiscoveryUserModel.fromJson(json)).toList();
      } else {
        throw Exception('Failed to search users: ${response.statusMessage}');
      }
    } on DioException catch (e) {
      throw Exception('Failed to search users: ${e.message}');
    } catch (e) {
      throw Exception('Failed to search users: $e');
    }
  }

  Future<void> updateLocation({
    required double latitude,
    required double longitude,
  }) async {
    try {
      final response = await _dioClient.post(
        AppConfig.updateLocationEndpoint,
        data: {
          'latitude': latitude,
          'longitude': longitude,
        },
      );

      if (response.statusCode != 200) {
        throw Exception('Failed to update location: ${response.statusMessage}');
      }
    } on DioException catch (e) {
      throw Exception('Failed to update location: ${e.message}');
    } catch (e) {
      throw Exception('Failed to update location: $e');
    }
  }
}