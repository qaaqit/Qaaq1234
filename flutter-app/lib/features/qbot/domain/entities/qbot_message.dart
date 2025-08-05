import 'package:equatable/equatable.dart';

enum QBOTMessageType {
  text,
  koihai,
  help,
  error,
  system,
}

class QBOTMessage extends Equatable {
  final String id;
  final String content;
  final bool isFromUser;
  final DateTime timestamp;
  final QBOTMessageType messageType;
  final Map<String, dynamic>? metadata;

  const QBOTMessage({
    required this.id,
    required this.content,
    required this.isFromUser,
    required this.timestamp,
    this.messageType = QBOTMessageType.text,
    this.metadata,
  });

  factory QBOTMessage.fromJson(Map<String, dynamic> json) {
    return QBOTMessage(
      id: json['id'] as String,
      content: json['content'] as String,
      isFromUser: json['isFromUser'] as bool,
      timestamp: DateTime.parse(json['timestamp'] as String),
      messageType: QBOTMessageType.values.firstWhere(
        (type) => type.name == json['messageType'],
        orElse: () => QBOTMessageType.text,
      ),
      metadata: json['metadata'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'content': content,
      'isFromUser': isFromUser,
      'timestamp': timestamp.toIso8601String(),
      'messageType': messageType.name,
      'metadata': metadata,
    };
  }

  QBOTMessage copyWith({
    String? id,
    String? content,
    bool? isFromUser,
    DateTime? timestamp,
    QBOTMessageType? messageType,
    Map<String, dynamic>? metadata,
  }) {
    return QBOTMessage(
      id: id ?? this.id,
      content: content ?? this.content,
      isFromUser: isFromUser ?? this.isFromUser,
      timestamp: timestamp ?? this.timestamp,
      messageType: messageType ?? this.messageType,
      metadata: metadata ?? this.metadata,
    );
  }

  @override
  List<Object?> get props => [
        id,
        content,
        isFromUser,
        timestamp,
        messageType,
        metadata,
      ];
}

class QBOTResponse extends Equatable {
  final String content;
  final QBOTMessageType messageType;
  final Map<String, dynamic>? metadata;

  const QBOTResponse({
    required this.content,
    this.messageType = QBOTMessageType.text,
    this.metadata,
  });

  factory QBOTResponse.fromJson(Map<String, dynamic> json) {
    return QBOTResponse(
      content: json['content'] as String,
      messageType: QBOTMessageType.values.firstWhere(
        (type) => type.name == json['messageType'],
        orElse: () => QBOTMessageType.text,
      ),
      metadata: json['metadata'] as Map<String, dynamic>?,
    );
  }

  @override
  List<Object?> get props => [content, messageType, metadata];
}