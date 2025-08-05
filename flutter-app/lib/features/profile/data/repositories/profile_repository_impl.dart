import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../../auth/domain/entities/user.dart';
import '../../domain/repositories/profile_repository.dart';
import '../datasources/profile_remote_datasource.dart';

class ProfileRepositoryImpl implements ProfileRepository {
  final ProfileRemoteDataSource _remoteDataSource;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  ProfileRepositoryImpl({
    required ProfileRemoteDataSource remoteDataSource,
  }) : _remoteDataSource = remoteDataSource;

  @override
  Future<User> getProfile() async {
    try {
      return await _remoteDataSource.getProfile();
    } catch (e) {
      throw Exception('Failed to get profile: $e');
    }
  }

  @override
  Future<void> updateProfile(User user) async {
    // TODO: Implement profile update
    throw UnimplementedError('Profile update not implemented yet');
  }

  @override
  Future<void> logout() async {
    await _storage.delete(key: 'auth_token');
  }
}