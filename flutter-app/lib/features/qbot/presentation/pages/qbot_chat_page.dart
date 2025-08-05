import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/qbot_bloc.dart';
import '../widgets/qbot_message_list.dart';
import '../widgets/qbot_input_area.dart';
import '../widgets/qbot_header.dart';

class QBOTChatPage extends StatefulWidget {
  const QBOTChatPage({super.key});

  @override
  State<QBOTChatPage> createState() => _QBOTChatPageState();
}

class _QBOTChatPageState extends State<QBOTChatPage> {
  @override
  void initState() {
    super.initState();
    context.read<QBOTBloc>().add(LoadChatHistory());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            // QBOT Header
            QBOTHeader(
              onClear: () {
                context.read<QBOTBloc>().add(ClearChat());
              },
            ),
            
            // Messages List
            Expanded(
              child: BlocBuilder<QBOTBloc, QBOTState>(
                builder: (context, state) {
                  if (state is QBOTLoading) {
                    return const Center(
                      child: CircularProgressIndicator(),
                    );
                  }
                  
                  if (state is QBOTLoaded) {
                    return QBOTMessageList(
                      messages: state.messages,
                    );
                  }
                  
                  if (state is QBOTError) {
                    return Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(
                            Icons.error_outline,
                            size: 64,
                            color: Colors.red,
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'Error: ${state.message}',
                            style: const TextStyle(color: Colors.red),
                          ),
                          const SizedBox(height: 16),
                          ElevatedButton(
                            onPressed: () {
                              context.read<QBOTBloc>().add(LoadChatHistory());
                            },
                            child: const Text('Retry'),
                          ),
                        ],
                      ),
                    );
                  }
                  
                  return const QBOTWelcomeScreen();
                },
              ),
            ),
            
            // Input Area
            BlocBuilder<QBOTBloc, QBOTState>(
              builder: (context, state) {
                final isLoading = state is QBOTSending;
                return QBOTInputArea(
                  onSendMessage: (message) {
                    context.read<QBOTBloc>().add(SendMessage(message));
                  },
                  disabled: isLoading,
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class QBOTWelcomeScreen extends StatelessWidget {
  const QBOTWelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFFFF6B35), Color(0xFFFF8E53)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(60),
              ),
              child: const Icon(
                Icons.smart_toy,
                size: 60,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'Welcome to QBOT AI',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Color(0xFF1F2937),
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Your maritime AI assistant is ready to help!\n\nAsk questions about shipping, regulations, career guidance, or say "Koi Hai?" to find nearby sailors.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 16,
                color: Color(0xFF6B7280),
                height: 1.5,
              ),
            ),
            const SizedBox(height: 32),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _buildSuggestionChip(context, '🌊 Koi Hai?'),
                _buildSuggestionChip(context, '⚓ Career Advice'),
                _buildSuggestionChip(context, '📜 Regulations'),
                _buildSuggestionChip(context, '🚢 Ship Questions'),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSuggestionChip(BuildContext context, String text) {
    return InkWell(
      onTap: () {
        context.read<QBOTBloc>().add(SendMessage(text));
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: const Color(0xFF0891B2).withOpacity(0.1),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: const Color(0xFF0891B2).withOpacity(0.3),
          ),
        ),
        child: Text(
          text,
          style: const TextStyle(
            color: Color(0xFF0891B2),
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
    );
  }
}