import '../../../auth/domain/entities/user.dart';

abstract class ProfileRepository {
  Future<User> getProfile();
  Future<void> updateProfile(User user);
  Future<void> logout();
}