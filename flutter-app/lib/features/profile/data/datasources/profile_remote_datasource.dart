import 'package:dio/dio.dart';
import '../../../../core/network/dio_client.dart';
import '../../../../core/config/app_config.dart';
import '../../../auth/data/models/user_model.dart';

class ProfileRemoteDataSource {
  final DioClient _dioClient;

  ProfileRemoteDataSource(this._dioClient);

  Future<UserModel> getProfile() async {
    try {
      final response = await _dioClient.get(AppConfig.profileEndpoint);

      if (response.statusCode == 200) {
        return UserModel.fromJson(response.data);
      } else {
        throw Exception('Failed to get profile: ${response.statusMessage}');
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        throw Exception('Unauthorized: Please login again');
      } else if (e.response?.statusCode == 404) {
        throw Exception('Profile not found');
      } else {
        throw Exception('Failed to get profile: ${e.message}');
      }
    } catch (e) {
      throw Exception('Failed to get profile: $e');
    }
  }
}