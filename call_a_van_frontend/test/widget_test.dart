import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:call_a_van/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    // Note: Since main loads dotenv, in a test environment we just test the widget tree direct load.
    await tester.pumpWidget(const CallAVanApp());

    // Verify home screen loads without crash
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
