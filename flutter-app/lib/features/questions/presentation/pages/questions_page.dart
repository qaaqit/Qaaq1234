import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/questions_bloc.dart';
import '../widgets/question_card.dart';
import '../widgets/question_search_bar.dart';
import '../widgets/question_filter_chips.dart';

class QuestionsPage extends StatefulWidget {
  const QuestionsPage({super.key});

  @override
  State<QuestionsPage> createState() => _QuestionsPageState();
}

class _QuestionsPageState extends State<QuestionsPage> {
  final ScrollController _scrollController = ScrollController();
  String _searchQuery = '';
  String _selectedCategory = 'All';

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    context.read<QuestionsBloc>().add(LoadQuestions());
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_isBottom) {
      context.read<QuestionsBloc>().add(LoadMoreQuestions());
    }
  }

  bool get _isBottom {
    if (!_scrollController.hasClients) return false;
    final maxScroll = _scrollController.position.maxScrollExtent;
    final currentScroll = _scrollController.offset;
    return currentScroll >= (maxScroll * 0.9);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Channel 13 Q&A'),
        backgroundColor: const Color(0xFF0891B2),
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            onPressed: () {
              // Navigate to ask question page
              Navigator.of(context).pushNamed('/ask-question');
            },
            icon: const Icon(Icons.add),
          ),
        ],
      ),
      body: Column(
        children: [
          // Search Bar
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: QuestionSearchBar(
              onSearch: (query) {
                setState(() {
                  _searchQuery = query;
                });
                context.read<QuestionsBloc>().add(SearchQuestions(query));
              },
            ),
          ),

          // Filter Chips
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0),
            child: QuestionFilterChips(
              selectedCategory: _selectedCategory,
              onCategorySelected: (category) {
                setState(() {
                  _selectedCategory = category;
                });
                context.read<QuestionsBloc>().add(FilterByCategory(category));
              },
            ),
          ),

          // Questions List
          Expanded(
            child: BlocBuilder<QuestionsBloc, QuestionsState>(
              builder: (context, state) {
                if (state is QuestionsLoading && state.questions.isEmpty) {
                  return const Center(
                    child: CircularProgressIndicator(),
                  );
                }

                if (state is QuestionsError && state.questions.isEmpty) {
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
                            context.read<QuestionsBloc>().add(LoadQuestions());
                          },
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  );
                }

                final questions = state.questions;
                final hasReachedMax = state is QuestionsLoaded && state.hasReachedMax;

                if (questions.isEmpty) {
                  return const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.help_outline,
                          size: 64,
                          color: Colors.grey,
                        ),
                        SizedBox(height: 16),
                        Text(
                          'No questions found',
                          style: TextStyle(
                            fontSize: 18,
                            color: Colors.grey,
                          ),
                        ),
                        SizedBox(height: 8),
                        Text(
                          'Be the first to ask a question!',
                          style: TextStyle(
                            color: Colors.grey,
                          ),
                        ),
                      ],
                    ),
                  );
                }

                return RefreshIndicator(
                  onRefresh: () async {
                    context.read<QuestionsBloc>().add(RefreshQuestions());
                  },
                  child: ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.all(16),
                    itemCount: hasReachedMax ? questions.length : questions.length + 1,
                    itemBuilder: (context, index) {
                      if (index >= questions.length) {
                        return const Center(
                          child: Padding(
                            padding: EdgeInsets.all(16.0),
                            child: CircularProgressIndicator(),
                          ),
                        );
                      }

                      final question = questions[index];
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: QuestionCard(
                          question: question,
                          onTap: () {
                            Navigator.of(context).pushNamed(
                              '/question/${question.id}',
                            );
                          },
                        ),
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          Navigator.of(context).pushNamed('/ask-question');
        },
        backgroundColor: const Color(0xFF0891B2),
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }
}