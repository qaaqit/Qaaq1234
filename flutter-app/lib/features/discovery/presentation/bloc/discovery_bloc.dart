import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../domain/entities/discovery_user.dart';
import '../../domain/repositories/discovery_repository.dart';
import '../../../../core/utils/logger.dart';

// Events
abstract class DiscoveryEvent extends Equatable {
  const DiscoveryEvent();

  @override
  List<Object?> get props => [];
}

class SearchUsers extends DiscoveryEvent {
  final String? query;
  final double? latitude;
  final double? longitude;
  final double? radius;
  final int? limit;

  const SearchUsers({
    this.query,
    this.latitude,
    this.longitude,
    this.radius,
    this.limit,
  });

  @override
  List<Object?> get props => [query, latitude, longitude, radius, limit];
}

class GetNearbyUsers extends DiscoveryEvent {
  final double latitude;
  final double longitude;
  final double radius;
  final int limit;

  const GetNearbyUsers({
    required this.latitude,
    required this.longitude,
    this.radius = 50.0,
    this.limit = 10,
  });

  @override
  List<Object> get props => [latitude, longitude, radius, limit];
}

class UpdateLocation extends DiscoveryEvent {
  final double latitude;
  final double longitude;

  const UpdateLocation({
    required this.latitude,
    required this.longitude,
  });

  @override
  List<Object> get props => [latitude, longitude];
}

class ClearSearch extends DiscoveryEvent {}

// States
abstract class DiscoveryState extends Equatable {
  const DiscoveryState();

  @override
  List<Object?> get props => [];
}

class DiscoveryInitial extends DiscoveryState {}

class DiscoveryLoading extends DiscoveryState {}

class DiscoverySuccess extends DiscoveryState {
  final List<DiscoveryUser> users;
  final String? searchQuery;
  final bool isNearbySearch;

  const DiscoverySuccess({
    required this.users,
    this.searchQuery,
    this.isNearbySearch = false,
  });

  @override
  List<Object?> get props => [users, searchQuery, isNearbySearch];
}

class DiscoveryFailure extends DiscoveryState {
  final String message;

  const DiscoveryFailure({required this.message});

  @override
  List<Object> get props => [message];
}

class LocationUpdated extends DiscoveryState {}

// Bloc
class DiscoveryBloc extends Bloc<DiscoveryEvent, DiscoveryState> {
  final DiscoveryRepository _discoveryRepository;

  DiscoveryBloc({required DiscoveryRepository discoveryRepository})
      : _discoveryRepository = discoveryRepository,
        super(DiscoveryInitial()) {
    on<SearchUsers>(_onSearchUsers);
    on<GetNearbyUsers>(_onGetNearbyUsers);
    on<UpdateLocation>(_onUpdateLocation);
    on<ClearSearch>(_onClearSearch);
  }

  Future<void> _onSearchUsers(
    SearchUsers event,
    Emitter<DiscoveryState> emit,
  ) async {
    emit(DiscoveryLoading());
    
    try {
      AppLogger.info('Searching users with query: ${event.query}');
      
      final users = await _discoveryRepository.searchUsers(
        query: event.query,
        latitude: event.latitude,
        longitude: event.longitude,
        radius: event.radius ?? 50.0,
        limit: event.limit ?? 100,
      );
      
      AppLogger.info('Found ${users.length} users');
      
      emit(DiscoverySuccess(
        users: users,
        searchQuery: event.query,
        isNearbySearch: false,
      ));
    } catch (e) {
      AppLogger.error('Search users failed', e);
      emit(DiscoveryFailure(message: e.toString().replaceFirst('Exception: ', '')));
    }
  }

  Future<void> _onGetNearbyUsers(
    GetNearbyUsers event,
    Emitter<DiscoveryState> emit,
  ) async {
    emit(DiscoveryLoading());
    
    try {
      AppLogger.info('Getting nearby users at ${event.latitude}, ${event.longitude}');
      
      final users = await _discoveryRepository.getNearbyUsers(
        latitude: event.latitude,
        longitude: event.longitude,
        radius: event.radius,
        limit: event.limit,
      );
      
      AppLogger.info('Found ${users.length} nearby users');
      
      emit(DiscoverySuccess(
        users: users,
        isNearbySearch: true,
      ));
    } catch (e) {
      AppLogger.error('Get nearby users failed', e);
      emit(DiscoveryFailure(message: e.toString().replaceFirst('Exception: ', '')));
    }
  }

  Future<void> _onUpdateLocation(
    UpdateLocation event,
    Emitter<DiscoveryState> emit,
  ) async {
    try {
      AppLogger.info('Updating location to ${event.latitude}, ${event.longitude}');
      
      await _discoveryRepository.updateLocation(
        latitude: event.latitude,
        longitude: event.longitude,
      );
      
      AppLogger.info('Location updated successfully');
      emit(LocationUpdated());
    } catch (e) {
      AppLogger.error('Update location failed', e);
      emit(DiscoveryFailure(message: e.toString().replaceFirst('Exception: ', '')));
    }
  }

  Future<void> _onClearSearch(
    ClearSearch event,
    Emitter<DiscoveryState> emit,
  ) async {
    emit(DiscoveryInitial());
  }
}