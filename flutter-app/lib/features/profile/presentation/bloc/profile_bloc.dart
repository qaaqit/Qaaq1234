import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../auth/domain/entities/user.dart';
import '../../domain/repositories/profile_repository.dart';
import '../../../../core/utils/logger.dart';

// Events
abstract class ProfileEvent extends Equatable {
  const ProfileEvent();

  @override
  List<Object> get props => [];
}

class LoadProfile extends ProfileEvent {}

class LogoutRequested extends ProfileEvent {}

// States
abstract class ProfileState extends Equatable {
  const ProfileState();

  @override
  List<Object?> get props => [];
}

class ProfileInitial extends ProfileState {}

class ProfileLoading extends ProfileState {}

class ProfileLoaded extends ProfileState {
  final User user;

  const ProfileLoaded({required this.user});

  @override
  List<Object> get props => [user];
}

class ProfileFailure extends ProfileState {
  final String message;

  const ProfileFailure({required this.message});

  @override
  List<Object> get props => [message];
}

class ProfileLoggedOut extends ProfileState {}

// Bloc
class ProfileBloc extends Bloc<ProfileEvent, ProfileState> {
  final ProfileRepository _profileRepository;

  ProfileBloc({required ProfileRepository profileRepository})
      : _profileRepository = profileRepository,
        super(ProfileInitial()) {
    on<LoadProfile>(_onLoadProfile);
    on<LogoutRequested>(_onLogoutRequested);
  }

  Future<void> _onLoadProfile(
    LoadProfile event,
    Emitter<ProfileState> emit,
  ) async {
    emit(ProfileLoading());
    
    try {
      AppLogger.info('Loading user profile');
      
      final user = await _profileRepository.getProfile();
      
      AppLogger.info('Profile loaded successfully for user: ${user.id}');
      
      emit(ProfileLoaded(user: user));
    } catch (e) {
      AppLogger.error('Load profile failed', e);
      emit(ProfileFailure(message: e.toString().replaceFirst('Exception: ', '')));
    }
  }

  Future<void> _onLogoutRequested(
    LogoutRequested event,
    Emitter<ProfileState> emit,
  ) async {
    try {
      AppLogger.info('Logging out user');
      
      await _profileRepository.logout();
      
      AppLogger.info('User logged out successfully');
      
      emit(ProfileLoggedOut());
    } catch (e) {
      AppLogger.error('Logout failed', e);
      emit(ProfileFailure(message: 'Logout failed: $e'));
    }
  }
}