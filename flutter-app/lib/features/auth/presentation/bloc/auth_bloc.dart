import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../domain/entities/user.dart';
import '../../domain/repositories/auth_repository.dart';
import '../../../../core/utils/logger.dart';

// Events
abstract class AuthEvent extends Equatable {
  const AuthEvent();

  @override
  List<Object> get props => [];
}

class LoginRequested extends AuthEvent {
  final String userId;
  final String password;

  const LoginRequested({
    required this.userId,
    required this.password,
  });

  @override
  List<Object> get props => [userId, password];
}

class LogoutRequested extends AuthEvent {}

class CheckAuthStatus extends AuthEvent {}

class GetProfile extends AuthEvent {}

// States
abstract class AuthState extends Equatable {
  const AuthState();

  @override
  List<Object?> get props => [];
}

class AuthInitial extends AuthState {}

class AuthLoading extends AuthState {}

class AuthSuccess extends AuthState {
  final User user;
  final String token;

  const AuthSuccess({
    required this.user,
    required this.token,
  });

  @override
  List<Object> get props => [user, token];
}

class AuthFailure extends AuthState {
  final String message;

  const AuthFailure({required this.message});

  @override
  List<Object> get props => [message];
}

class AuthLoggedOut extends AuthState {}

// Bloc
class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final AuthRepository _authRepository;

  AuthBloc({required AuthRepository authRepository})
      : _authRepository = authRepository,
        super(AuthInitial()) {
    on<LoginRequested>(_onLoginRequested);
    on<LogoutRequested>(_onLogoutRequested);
    on<CheckAuthStatus>(_onCheckAuthStatus);
    on<GetProfile>(_onGetProfile);
  }

  Future<void> _onLoginRequested(
    LoginRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    
    try {
      AppLogger.info('Attempting login for user: ${event.userId}');
      
      final result = await _authRepository.login(
        userId: event.userId,
        password: event.password,
      );
      
      AppLogger.info('Login successful for user: ${result.user.id}');
      
      emit(AuthSuccess(
        user: result.user,
        token: result.token,
      ));
    } catch (e) {
      AppLogger.error('Login failed', e);
      emit(AuthFailure(message: e.toString().replaceFirst('Exception: ', '')));
    }
  }

  Future<void> _onLogoutRequested(
    LogoutRequested event,
    Emitter<AuthState> emit,
  ) async {
    try {
      await _authRepository.logout();
      AppLogger.info('User logged out successfully');
      emit(AuthLoggedOut());
    } catch (e) {
      AppLogger.error('Logout failed', e);
      emit(AuthFailure(message: 'Logout failed: $e'));
    }
  }

  Future<void> _onCheckAuthStatus(
    CheckAuthStatus event,
    Emitter<AuthState> emit,
  ) async {
    try {
      final isLoggedIn = await _authRepository.isLoggedIn();
      
      if (isLoggedIn) {
        AppLogger.info('User is logged in, fetching profile');
        final user = await _authRepository.getProfile();
        final token = await _authRepository.getAuthToken();
        
        if (token != null) {
          emit(AuthSuccess(user: user, token: token));
        } else {
          emit(AuthLoggedOut());
        }
      } else {
        AppLogger.info('User is not logged in');
        emit(AuthLoggedOut());
      }
    } catch (e) {
      AppLogger.error('Auth status check failed', e);
      emit(AuthLoggedOut());
    }
  }

  Future<void> _onGetProfile(
    GetProfile event,
    Emitter<AuthState> emit,
  ) async {
    try {
      final user = await _authRepository.getProfile();
      final token = await _authRepository.getAuthToken();
      
      if (token != null) {
        emit(AuthSuccess(user: user, token: token));
      } else {
        emit(AuthLoggedOut());
      }
    } catch (e) {
      AppLogger.error('Get profile failed', e);
      emit(AuthFailure(message: 'Failed to get profile: $e'));
    }
  }
}