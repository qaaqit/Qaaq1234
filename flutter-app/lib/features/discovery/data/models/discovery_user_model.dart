import '../../domain/entities/discovery_user.dart';

class DiscoveryUserModel extends DiscoveryUser {
  const DiscoveryUserModel({
    required super.id,
    required super.fullName,
    required super.userType,
    required super.rank,
    required super.shipName,
    required super.imoNumber,
    required super.port,
    required super.city,
    required super.country,
    required super.latitude,
    required super.longitude,
    super.deviceLatitude,
    super.deviceLongitude,
    required super.locationSource,
    required super.locationUpdatedAt,
    required super.isVerified,
    super.questionCount,
    super.answerCount,
    super.whatsAppProfilePictureUrl,
    super.whatsAppDisplayName,
    super.distance,
  });

  factory DiscoveryUserModel.fromJson(Map<String, dynamic> json) {
    return DiscoveryUserModel(
      id: json['id'] ?? '',
      fullName: json['fullName'] ?? '',
      userType: json['userType'] ?? 'local',
      rank: json['rank'] ?? '',
      shipName: json['shipName'] ?? '',
      imoNumber: json['imoNumber'] ?? '',
      port: json['port'] ?? '',
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
      questionCount: json['questionCount'] ?? 0,
      answerCount: json['answerCount'] ?? 0,
      whatsAppProfilePictureUrl: json['whatsAppProfilePictureUrl'],
      whatsAppDisplayName: json['whatsAppDisplayName'],
      distance: json['distance']?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'fullName': fullName,
      'userType': userType,
      'rank': rank,
      'shipName': shipName,
      'imoNumber': imoNumber,
      'port': port,
      'city': city,
      'country': country,
      'latitude': latitude,
      'longitude': longitude,
      'deviceLatitude': deviceLatitude,
      'deviceLongitude': deviceLongitude,
      'locationSource': locationSource,
      'locationUpdatedAt': locationUpdatedAt.toIso8601String(),
      'isVerified': isVerified,
      'questionCount': questionCount,
      'answerCount': answerCount,
      'whatsAppProfilePictureUrl': whatsAppProfilePictureUrl,
      'whatsAppDisplayName': whatsAppDisplayName,
      'distance': distance,
    };
  }
}