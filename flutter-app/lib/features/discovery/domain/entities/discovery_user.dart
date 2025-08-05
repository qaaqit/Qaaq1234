import 'package:equatable/equatable.dart';

class DiscoveryUser extends Equatable {
  final String id;
  final String fullName;
  final String userType; // 'sailor' or 'local'
  final String rank;
  final String shipName;
  final String imoNumber;
  final String port;
  final String city;
  final String country;
  final double latitude;
  final double longitude;
  final double? deviceLatitude;
  final double? deviceLongitude;
  final String locationSource;
  final DateTime locationUpdatedAt;
  final bool isVerified;
  final int questionCount;
  final int answerCount;
  final String? whatsAppProfilePictureUrl;
  final String? whatsAppDisplayName;
  final double? distance; // Distance from current user in km

  const DiscoveryUser({
    required this.id,
    required this.fullName,
    required this.userType,
    required this.rank,
    required this.shipName,
    required this.imoNumber,
    required this.port,
    required this.city,
    required this.country,
    required this.latitude,
    required this.longitude,
    this.deviceLatitude,
    this.deviceLongitude,
    required this.locationSource,
    required this.locationUpdatedAt,
    required this.isVerified,
    this.questionCount = 0,
    this.answerCount = 0,
    this.whatsAppProfilePictureUrl,
    this.whatsAppDisplayName,
    this.distance,
  });

  bool get isSailor => userType == 'sailor';
  bool get isLocal => userType == 'local';
  bool get isOnboard => shipName.isNotEmpty && imoNumber.isNotEmpty;
  
  String get displayLocation => city.isNotEmpty ? '$city, $country' : country;
  String get displayRank => rank.isNotEmpty ? rank : (isSailor ? 'Seafarer' : 'Local');
  String get displayShip => shipName.isNotEmpty ? shipName : 'Shore-based';
  String get displayDistance => distance != null ? '${distance!.toStringAsFixed(1)} km' : '';

  @override
  List<Object?> get props => [
    id,
    fullName,
    userType,
    rank,
    shipName,
    imoNumber,
    port,
    city,
    country,
    latitude,
    longitude,
    deviceLatitude,
    deviceLongitude,
    locationSource,
    locationUpdatedAt,
    isVerified,
    questionCount,
    answerCount,
    whatsAppProfilePictureUrl,
    whatsAppDisplayName,
    distance,
  ];
}