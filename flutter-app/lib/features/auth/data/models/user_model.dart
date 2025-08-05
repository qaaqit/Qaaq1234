import '../../domain/entities/user.dart';

class UserModel extends User {
  const UserModel({
    required super.id,
    required super.fullName,
    required super.email,
    required super.userType,
    required super.isAdmin,
    required super.nickname,
    required super.rank,
    required super.shipName,
    required super.imoNumber,
    required super.port,
    required super.visitWindow,
    required super.city,
    required super.country,
    required super.latitude,
    required super.longitude,
    super.deviceLatitude,
    super.deviceLongitude,
    required super.locationSource,
    required super.locationUpdatedAt,
    required super.isVerified,
    required super.loginCount,
    required super.lastLogin,
    required super.createdAt,
    super.questionCount,
    super.answerCount,
    super.whatsAppNumber,
    super.whatsAppProfilePictureUrl,
    super.whatsAppDisplayName,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? '',
      fullName: json['fullName'] ?? '',
      email: json['email'] ?? '',
      userType: json['userType'] ?? 'local',
      isAdmin: json['isAdmin'] ?? false,
      nickname: json['nickname'] ?? '',
      rank: json['rank'] ?? '',
      shipName: json['shipName'] ?? '',
      imoNumber: json['imoNumber'] ?? '',
      port: json['port'] ?? '',
      visitWindow: json['visitWindow'] ?? '',
      city: json['city'] ?? '',
      country: json['country'] ?? '',
      latitude: (json['latitude'] ?? 0.0).toDouble(),
      longitude: (json['longitude'] ?? 0.0).toDouble(),
      deviceLatitude: json['deviceLatitude']?.toDouble(),
      deviceLongitude: json['deviceLongitude']?.toDouble(),
      locationSource: json['locationSource'] ?? 'city',
      locationUpdatedAt: json['locationUpdatedAt'] != null 
          ? DateTime.parse(json['locationUpdatedAt'])
          : DateTime.now(),
      isVerified: json['isVerified'] ?? false,
      loginCount: json['loginCount'] ?? 0,
      lastLogin: json['lastLogin'] != null 
          ? DateTime.parse(json['lastLogin'])
          : DateTime.now(),
      createdAt: json['createdAt'] != null 
          ? DateTime.parse(json['createdAt'])
          : DateTime.now(),
      questionCount: json['questionCount'] ?? 0,
      answerCount: json['answerCount'] ?? 0,
      whatsAppNumber: json['whatsAppNumber'],
      whatsAppProfilePictureUrl: json['whatsAppProfilePictureUrl'],
      whatsAppDisplayName: json['whatsAppDisplayName'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'fullName': fullName,
      'email': email,
      'userType': userType,
      'isAdmin': isAdmin,
      'nickname': nickname,
      'rank': rank,
      'shipName': shipName,
      'imoNumber': imoNumber,
      'port': port,
      'visitWindow': visitWindow,
      'city': city,
      'country': country,
      'latitude': latitude,
      'longitude': longitude,
      'deviceLatitude': deviceLatitude,
      'deviceLongitude': deviceLongitude,
      'locationSource': locationSource,
      'locationUpdatedAt': locationUpdatedAt.toIso8601String(),
      'isVerified': isVerified,
      'loginCount': loginCount,
      'lastLogin': lastLogin.toIso8601String(),
      'createdAt': createdAt.toIso8601String(),
      'questionCount': questionCount,
      'answerCount': answerCount,
      'whatsAppNumber': whatsAppNumber,
      'whatsAppProfilePictureUrl': whatsAppProfilePictureUrl,
      'whatsAppDisplayName': whatsAppDisplayName,
    };
  }
}