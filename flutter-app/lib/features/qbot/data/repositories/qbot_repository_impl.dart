import 'package:dio/dio.dart';
import '../../domain/entities/qbot_message.dart';
import '../../domain/repositories/qbot_repository.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/utils/logger.dart';

class QBOTRepositoryImpl implements QBOTRepository {
  final DioClient _dioClient;

  QBOTRepositoryImpl(this._dioClient);

  @override
  Future<List<QBOTMessage>> getChatHistory() async {
    try {
      final response = await _dioClient.get('/qbot/history');
      
      if (response.data['success'] == true) {
        final messages = response.data['messages'] as List;
        return messages
            .map((json) => QBOTMessage.fromJson(json))
            .toList();
      }
      
      return [];
    } catch (e) {
      AppLogger.error('Failed to get chat history', e);
      return [];
    }
  }

  @override
  Future<QBOTResponse> sendMessage(String message) async {
    try {
      final response = await _dioClient.post('/qbot/chat', data: {
        'message': message,
        'timestamp': DateTime.now().toIso8601String(),
      });

      if (response.data['success'] == true) {
        return QBOTResponse.fromJson(response.data['response']);
      }

      throw Exception(response.data['message'] ?? 'Failed to send message');
    } catch (e) {
      AppLogger.error('Failed to send message to QBOT', e);
      
      // Handle different types of messages locally if API fails
      if (message.toLowerCase().contains('koi hai')) {
        return _handleKoihaiMessage();
      }
      
      if (message.toLowerCase().contains('help')) {
        return _handleHelpMessage();
      }
      
      return const QBOTResponse(
        content: 'Sorry, I\'m having trouble connecting right now. Please try again.',
        messageType: QBOTMessageType.error,
      );
    }
  }

  @override
  Future<void> clearChatHistory() async {
    try {
      await _dioClient.delete('/qbot/history');
    } catch (e) {
      AppLogger.error('Failed to clear chat history', e);
      // Don't throw - clearing is not critical
    }
  }

  @override
  Future<bool> isQBOTOnline() async {
    try {
      final response = await _dioClient.get('/qbot/status');
      return response.data['online'] == true;
    } catch (e) {
      AppLogger.error('Failed to check QBOT status', e);
      return false;
    }
  }

  // Local fallback handlers
  QBOTResponse _handleKoihaiMessage() {
    return const QBOTResponse(
      content: '''🌊 Koi Hai? - Finding nearby sailors...

I can help you discover maritime professionals near your location! This feature connects you with:

⚓ Fellow sailors and mariners
🚢 Port officials and agents  
🏢 Maritime service providers
🎓 Maritime academy students

To get started:
1. Enable location services
2. Go to the "Koi Hai?" tab
3. Tap search to find nearby professionals

Would you like me to help with anything else?''',
      messageType: QBOTMessageType.koihai,
    );
  }

  QBOTResponse _handleHelpMessage() {
    return const QBOTResponse(
      content: '''🤖 QBOT AI Assistant - How I can help:

**Navigation Commands:**
• "Koi Hai?" - Find nearby sailors
• "Questions" - Browse maritime Q&A
• "Groups" - Explore maritime groups

**Maritime Assistance:**
• Career guidance and advice
• Shipping regulations and compliance
• Port procedures and documentation
• Vessel operations and safety
• Maritime law and conventions

**Features:**
• Real-time location discovery
• Professional networking
• Q&A knowledge sharing
• Group discussions

Ask me anything about maritime industry, regulations, career paths, or use navigation commands to explore the app!''',
      messageType: QBOTMessageType.help,
    );
  }
}