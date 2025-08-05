import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../domain/entities/qbot_message.dart';
import '../../domain/repositories/qbot_repository.dart';

// Events
abstract class QBOTEvent extends Equatable {
  const QBOTEvent();

  @override
  List<Object> get props => [];
}

class LoadChatHistory extends QBOTEvent {}

class SendMessage extends QBOTEvent {
  final String message;

  const SendMessage(this.message);

  @override
  List<Object> get props => [message];
}

class ClearChat extends QBOTEvent {}

class ReceiveMessage extends QBOTEvent {
  final QBOTMessage message;

  const ReceiveMessage(this.message);

  @override
  List<Object> get props => [message];
}

// States
abstract class QBOTState extends Equatable {
  const QBOTState();

  @override
  List<Object> get props => [];
}

class QBOTInitial extends QBOTState {}

class QBOTLoading extends QBOTState {}

class QBOTLoaded extends QBOTState {
  final List<QBOTMessage> messages;

  const QBOTLoaded(this.messages);

  @override
  List<Object> get props => [messages];
}

class QBOTSending extends QBOTState {
  final List<QBOTMessage> messages;

  const QBOTSending(this.messages);

  @override
  List<Object> get props => [messages];
}

class QBOTError extends QBOTState {
  final String message;

  const QBOTError(this.message);

  @override
  List<Object> get props => [message];
}

// BLoC
class QBOTBloc extends Bloc<QBOTEvent, QBOTState> {
  final QBOTRepository repository;
  List<QBOTMessage> _messages = [];

  QBOTBloc({required this.repository}) : super(QBOTInitial()) {
    on<LoadChatHistory>(_onLoadChatHistory);
    on<SendMessage>(_onSendMessage);
    on<ClearChat>(_onClearChat);
    on<ReceiveMessage>(_onReceiveMessage);
  }

  void _onLoadChatHistory(LoadChatHistory event, Emitter<QBOTState> emit) async {
    emit(QBOTLoading());
    try {
      _messages = await repository.getChatHistory();
      emit(QBOTLoaded(_messages));
    } catch (e) {
      emit(QBOTError('Failed to load chat history: ${e.toString()}'));
    }
  }

  void _onSendMessage(SendMessage event, Emitter<QBOTState> emit) async {
    // Add user message immediately
    final userMessage = QBOTMessage(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      content: event.message,
      isFromUser: true,
      timestamp: DateTime.now(),
    );

    _messages.add(userMessage);
    emit(QBOTSending(_messages));

    try {
      // Send message to QBOT API
      final response = await repository.sendMessage(event.message);
      
      // Add bot response
      final botMessage = QBOTMessage(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        content: response.content,
        isFromUser: false,
        timestamp: DateTime.now(),
        messageType: response.messageType,
      );

      _messages.add(botMessage);
      emit(QBOTLoaded(_messages));
    } catch (e) {
      // Add error message
      final errorMessage = QBOTMessage(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        content: 'Sorry, I encountered an error. Please try again.',
        isFromUser: false,
        timestamp: DateTime.now(),
        messageType: QBOTMessageType.error,
      );

      _messages.add(errorMessage);
      emit(QBOTError('Failed to send message: ${e.toString()}'));
    }
  }

  void _onClearChat(ClearChat event, Emitter<QBOTState> emit) async {
    try {
      await repository.clearChatHistory();
      _messages.clear();
      emit(QBOTLoaded(_messages));
    } catch (e) {
      emit(QBOTError('Failed to clear chat: ${e.toString()}'));
    }
  }

  void _onReceiveMessage(ReceiveMessage event, Emitter<QBOTState> emit) {
    _messages.add(event.message);
    emit(QBOTLoaded(_messages));
  }
}