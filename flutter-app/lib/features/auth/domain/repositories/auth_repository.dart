import '../entities/user.dart';

abstract class AuthRepository {
  Future<({User user, String token, bool needsVerification})> login({
    required String userId,
    required String password,
  });
  
  Future<User> getProfile();
  
  Future<void> logout();
  
  Future<bool> isLoggedIn();
  
  Future<String?> getAuthToken();
  
  Future<void> saveAuthToken(String token);
  
  Future<void> clearAuthToken();
}