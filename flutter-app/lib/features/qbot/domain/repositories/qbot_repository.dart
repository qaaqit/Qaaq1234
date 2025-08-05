import '../entities/qbot_message.dart';

abstract class QBOTRepository {
  Future<List<QBOTMessage>> getChatHistory();
  Future<QBOTResponse> sendMessage(String message);
  Future<void> clearChatHistory();
  Future<bool> isQBOTOnline();
}