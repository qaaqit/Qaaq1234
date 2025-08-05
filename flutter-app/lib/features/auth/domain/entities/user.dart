import 'package:equatable/equatable.dart';

class User extends Equatable {
  final String id;
  final String fullName;
  final String email;
  final String userType; // 'sailor' or 'local'
  final bool isAdmin;
  final String nickname;
  final String rank;
  final String shipName;
  final String imoNumber;
  final String port;
  final String visitWindow;
  final String city;
  final String country;
  final double latitude;
  final double longitude;
  final double? deviceLatitude;
  final double? deviceLongitude;
  final String locationSource;
  final DateTime locationUpdatedAt;
  final bool isVerified;
  final int loginCount;
  final DateTime lastLogin;
  final DateTime createdAt;
  final int questionCount;
  final int answerCount;
  final String? whatsAppNumber;
  final String? whatsAppProfilePictureUrl;
  final String? whatsAppDisplayName;

  const User({
    required this.id,
    required this.fullName,
    required this.email,
    required this.userType,
    required this.isAdmin,
    required this.nickname,
    required this.rank,
    required this.shipName,
    required this.imoNumber,
    required this.port,
    required this.visitWindow,
    required this.city,
    required this.country,
    required this.latitude,
    required this.longitude,
    this.deviceLatitude,
    this.deviceLongitude,
    required this.locationSource,
    required this.locationUpdatedAt,
    required this.isVerified,
    required this.loginCount,
    required this.lastLogin,
    required this.createdAt,
    this.questionCount = 0,
    this.answerCount = 0,
    this.whatsAppNumber,
    this.whatsAppProfilePictureUrl,
    this.whatsAppDisplayName,
  });

  bool get isSailor => userType == 'sailor';
  bool get isLocal => userType == 'local';
  
  String get displayLocation => city.isNotEmpty ? '$city, $country' : country;
  String get displayRank => rank.isNotEmpty ? rank : (isSailor ? 'Seafarer' : 'Local');
  String get displayShip => shipName.isNotEmpty ? shipName : 'Shore-based';

  @override
  List<Object?> get props => [
    id,
    fullName,
    email,
    userType,
    isAdmin,
    nickname,
    rank,
    shipName,
    imoNumber,
    port,
    visitWindow,
    city,
    country,
    latitude,
    longitude,
    deviceLatitude,
    deviceLongitude,
    locationSource,
    locationUpdatedAt,
    isVerified,
    loginCount,
    lastLogin,
    createdAt,
    questionCount,
    answerCount,
    whatsAppNumber,
    whatsAppProfilePictureUrl,
    whatsAppDisplayName,
  ];
}