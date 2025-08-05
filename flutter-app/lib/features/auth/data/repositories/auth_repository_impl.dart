import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../domain/entities/user.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/auth_remote_datasource.dart';

class AuthRepositoryImpl implements AuthRepository {
  final AuthRemoteDataSource _remoteDataSource;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  AuthRepositoryImpl({
    required AuthRemoteDataSource remoteDataSource,
  }) : _remoteDataSource = remoteDataSource;

  @override
  Future<({User user, String token, bool needsVerification})> login({
    required String userId,
    required String password,
  }) async {
    try {
      final result = await _remoteDataSource.login(
        userId: userId,
        password: password,
      );
      
      // Save auth token
      await _storage.write(key: 'auth_token', value: result.token);
      
      return (
        user: result.user,
        token: result.token,
        needsVerification: result.needsVerification,
      );
    } catch (e) {
      throw Exception('Login failed: $e');
    }
  }

  @override
  Future<User> getProfile() async {
    try {
      return await _remoteDataSource.getProfile();
    } catch (e) {
      throw Exception('Failed to get profile: $e');
    }
  }

  @override
  Future<void> logout() async {
    await _storage.delete(key: 'auth_token');
  }

  @override
  Future<bool> isLoggedIn() async {
    final token = await _storage.read(key: 'auth_token');
    return token != null && token.isNotEmpty;
  }

  @override
  Future<String?> getAuthToken() async {
    return await _storage.read(key: 'auth_token');
  }

  @override
  Future<void> saveAuthToken(String token) async {
    await _storage.write(key: 'auth_token', value: token);
  }

  @override
  Future<void> clearAuthToken() async {
    await _storage.delete(key: 'auth_token');
  }
}