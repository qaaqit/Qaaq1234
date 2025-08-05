import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

class QaaqLogo extends StatelessWidget {
  final double size;
  
  const QaaqLogo({
    super.key,
    this.size = 80,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Logo Container
        Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Theme.of(context).colorScheme.primary,
                Theme.of(context).colorScheme.secondary,
              ],
            ),
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: Theme.of(context).colorScheme.primary.withOpacity(0.3),
                blurRadius: 20,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Stack(
            children: [
              // Background wave pattern
              Positioned.fill(
                child: CustomPaint(
                  painter: WavePainter(
                    color: Colors.white.withOpacity(0.1),
                  ),
                ),
              ),
              // Main icon
              Center(
                child: Icon(
                  LucideIcons.anchor,
                  size: size * 0.5,
                  color: Colors.white,
                ),
              ),
              // Compass overlay
              Positioned(
                top: size * 0.15,
                right: size * 0.15,
                child: Icon(
                  LucideIcons.compass,
                  size: size * 0.25,
                  color: Colors.white.withOpacity(0.7),
                ),
              ),
            ],
          ),
        ),
        
        const SizedBox(height: 16),
        
        // App name
        Text(
          'QAAQ',
          style: Theme.of(context).textTheme.headlineMedium?.copyWith(
            fontWeight: FontWeight.bold,
            color: Theme.of(context).colorScheme.primary,
            letterSpacing: 2,
          ),
        ),
        
        Text(
          'Connect',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            color: Theme.of(context).colorScheme.secondary,
            letterSpacing: 1,
          ),
        ),
      ],
    );
  }
}

class WavePainter extends CustomPainter {
  final Color color;
  
  WavePainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;

    final path = Path();
    final waveHeight = size.height * 0.1;
    final waveLength = size.width * 0.3;

    // Draw wave pattern
    for (double i = 0; i < size.width + waveLength; i += waveLength) {
      if (i == 0) {
        path.moveTo(i, size.height * 0.3);
      }
      path.quadraticBezierTo(
        i + waveLength / 2,
        size.height * 0.3 - waveHeight,
        i + waveLength,
        size.height * 0.3,
      );
    }

    // Second wave
    final path2 = Path();
    for (double i = 0; i < size.width + waveLength; i += waveLength) {
      if (i == 0) {
        path2.moveTo(i, size.height * 0.7);
      }
      path2.quadraticBezierTo(
        i + waveLength / 2,
        size.height * 0.7 + waveHeight,
        i + waveLength,
        size.height * 0.7,
      );
    }

    canvas.drawPath(path, paint);
    canvas.drawPath(path2, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}