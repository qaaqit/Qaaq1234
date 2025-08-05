import 'package:equatable/equatable.dart';

class Question extends Equatable {
  final String id;
  final String content;
  final String authorId;
  final String authorName;
  final String? authorRank;
  final DateTime createdAt;
  final DateTime updatedAt;
  final List<String> tags;
  final int views;
  final int answerCount;
  final bool isResolved;
  final bool isFromWhatsapp;
  final String? category;
  final List<String> imageUrls;
  final int engagementScore;
  final String? authorProfilePictureUrl;
  final String? authorWhatsappDisplayName;

  const Question({
    required this.id,
    required this.content,
    required this.authorId,
    required this.authorName,
    this.authorRank,
    required this.createdAt,
    required this.updatedAt,
    this.tags = const [],
    this.views = 0,
    this.answerCount = 0,
    this.isResolved = false,
    this.isFromWhatsapp = false,
    this.category,
    this.imageUrls = const [],
    this.engagementScore = 0,
    this.authorProfilePictureUrl,
    this.authorWhatsappDisplayName,
  });

  factory Question.fromJson(Map<String, dynamic> json) {
    return Question(
      id: json['id'].toString(),
      content: json['content'] as String,
      authorId: json['author_id'] as String,
      authorName: json['author_name'] as String,
      authorRank: json['author_rank'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
      tags: (json['tags'] as List?)?.map((tag) => tag.toString()).toList() ?? [],
      views: json['views'] as int? ?? 0,
      answerCount: json['answer_count'] as int? ?? 0,
      isResolved: json['is_resolved'] as bool? ?? false,
      isFromWhatsapp: json['is_from_whatsapp'] as bool? ?? false,
      category: json['category_name'] as String?,
      imageUrls: (json['image_urls'] as List?)?.map((url) => url.toString()).toList() ?? [],
      engagementScore: json['engagement_score'] as int? ?? 0,
      authorProfilePictureUrl: json['author_profile_picture_url'] as String?,
      authorWhatsappDisplayName: json['author_whatsapp_display_name'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'content': content,
      'author_id': authorId,
      'author_name': authorName,
      'author_rank': authorRank,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
      'tags': tags,
      'views': views,
      'answer_count': answerCount,
      'is_resolved': isResolved,
      'is_from_whatsapp': isFromWhatsapp,
      'category_name': category,
      'image_urls': imageUrls,
      'engagement_score': engagementScore,
      'author_profile_picture_url': authorProfilePictureUrl,
      'author_whatsapp_display_name': authorWhatsappDisplayName,
    };
  }

  Question copyWith({
    String? id,
    String? content,
    String? authorId,
    String? authorName,
    String? authorRank,
    DateTime? createdAt,
    DateTime? updatedAt,
    List<String>? tags,
    int? views,
    int? answerCount,
    bool? isResolved,
    bool? isFromWhatsapp,
    String? category,
    List<String>? imageUrls,
    int? engagementScore,
    String? authorProfilePictureUrl,
    String? authorWhatsappDisplayName,
  }) {
    return Question(
      id: id ?? this.id,
      content: content ?? this.content,
      authorId: authorId ?? this.authorId,
      authorName: authorName ?? this.authorName,
      authorRank: authorRank ?? this.authorRank,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      tags: tags ?? this.tags,
      views: views ?? this.views,
      answerCount: answerCount ?? this.answerCount,
      isResolved: isResolved ?? this.isResolved,
      isFromWhatsapp: isFromWhatsapp ?? this.isFromWhatsapp,
      category: category ?? this.category,
      imageUrls: imageUrls ?? this.imageUrls,
      engagementScore: engagementScore ?? this.engagementScore,
      authorProfilePictureUrl: authorProfilePictureUrl ?? this.authorProfilePictureUrl,
      authorWhatsappDisplayName: authorWhatsappDisplayName ?? this.authorWhatsappDisplayName,
    );
  }

  @override
  List<Object?> get props => [
        id,
        content,
        authorId,
        authorName,
        authorRank,
        createdAt,
        updatedAt,
        tags,
        views,
        answerCount,
        isResolved,
        isFromWhatsapp,
        category,
        imageUrls,
        engagementScore,
        authorProfilePictureUrl,
        authorWhatsappDisplayName,
      ];
}