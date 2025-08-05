import 'package:dio/dio.dart';
import '../../../../core/network/dio_client.dart';
import '../../../../core/config/app_config.dart';
import '../models/user_model.dart';

class AuthRemoteDataSource {
  final DioClient _dioClient;

  AuthRemoteDataSource(this._dioClient);

  Future<({UserModel user, String token, bool needsVerification})> login({
    required String userId,
    required String password,
  }) async {
    try {
      final response = await _dioClient.post(
        AppConfig.loginEndpoint,
        data: {
          'userId': userId,
          'password': password,
        },
      );

      if (response.statusCode == 200) {
        final data = response.data;
        return (
          user: UserModel.fromJson(data['user']),
          token: data['token'],
          needsVerification: data['needsVerification'] ?? false,
        );
      } else {
        throw Exception('Login failed: ${response.statusMessage}');
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        throw Exception('Invalid credentials');
      } else if (e.response?.statusCode == 404) {
        throw Exception('User not found');
      } else {
        throw Exception('Login failed: ${e.message}');
      }
    } catch (e) {
      throw Exception('Login failed: $e');
    }
  }

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