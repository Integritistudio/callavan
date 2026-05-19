// import 'package:flutter/material.dart';

// void main() {
//   runApp(const MyApp());
// }

// class MyApp extends StatelessWidget {
//   const MyApp({super.key});

//   // This widget is the root of your application.
//   @override
//   Widget build(BuildContext context) {
//     return MaterialApp(
//       title: 'Flutter Demo',
//       theme: ThemeData(
//         // This is the theme of your application.
//         //
//         // TRY THIS: Try running your application with "flutter run". You'll see
//         // the application has a purple toolbar. Then, without quitting the app,
//         // try changing the seedColor in the colorScheme below to Colors.green
//         // and then invoke "hot reload" (save your changes or press the "hot
//         // reload" button in a Flutter-supported IDE, or press "r" if you used
//         // the command line to start the app).
//         //
//         // Notice that the counter didn't reset back to zero; the application
//         // state is not lost during the reload. To reset the state, use hot
//         // restart instead.
//         //
//         // This works for code too, not just values: Most code changes can be
//         // tested with just a hot reload.
//         colorScheme: .fromSeed(seedColor: Colors.deepPurple),
//       ),
//       home: const MyHomePage(title: 'Flutter Demo Home Page'),
//     );
//   }
// }

// class MyHomePage extends StatefulWidget {
//   const MyHomePage({super.key, required this.title});

//   // This widget is the home page of your application. It is stateful, meaning
//   // that it has a State object (defined below) that contains fields that affect
//   // how it looks.

//   // This class is the configuration for the state. It holds the values (in this
//   // case the title) provided by the parent (in this case the App widget) and
//   // used by the build method of the State. Fields in a Widget subclass are
//   // always marked "final".

//   final String title;

//   @override
//   State<MyHomePage> createState() => _MyHomePageState();
// }

// class _MyHomePageState extends State<MyHomePage> {
//   int _counter = 0;

//   void _incrementCounter() {
//     setState(() {
//       // This call to setState tells the Flutter framework that something has
//       // changed in this State, which causes it to rerun the build method below
//       // so that the display can reflect the updated values. If we changed
//       // _counter without calling setState(), then the build method would not be
//       // called again, and so nothing would appear to happen.
//       _counter++;
//     });
//   }

//   @override
//   Widget build(BuildContext context) {
//     // This method is rerun every time setState is called, for instance as done
//     // by the _incrementCounter method above.
//     //
//     // The Flutter framework has been optimized to make rerunning build methods
//     // fast, so that you can just rebuild anything that needs updating rather
//     // than having to individually change instances of widgets.
//     return Scaffold(
//       appBar: AppBar(
//         // TRY THIS: Try changing the color here to a specific color (to
//         // Colors.amber, perhaps?) and trigger a hot reload to see the AppBar
//         // change color while the other colors stay the same.
//         backgroundColor: Theme.of(context).colorScheme.inversePrimary,
//         // Here we take the value from the MyHomePage object that was created by
//         // the App.build method, and use it to set our appbar title.
//         title: Text(widget.title),
//       ),
//       body: Center(
//         // Center is a layout widget. It takes a single child and positions it
//         // in the middle of the parent.
//         child: Column(
//           // Column is also a layout widget. It takes a list of children and
//           // arranges them vertically. By default, it sizes itself to fit its
//           // children horizontally, and tries to be as tall as its parent.
//           //
//           // Column has various properties to control how it sizes itself and
//           // how it positions its children. Here we use mainAxisAlignment to
//           // center the children vertically; the main axis here is the vertical
//           // axis because Columns are vertical (the cross axis would be
//           // horizontal).
//           //
//           // TRY THIS: Invoke "debug painting" (choose the "Toggle Debug Paint"
//           // action in the IDE, or press "p" in the console), to see the
//           // wireframe for each widget.
//           mainAxisAlignment: .center,
//           children: [
//             const Text('You have pushed the button this many times:'),
//             Text(
//               '$_counter',
//               style: Theme.of(context).textTheme.headlineMedium,
//             ),
//           ],
//         ),
//       ),
//       floatingActionButton: FloatingActionButton(
//         onPressed: _incrementCounter,
//         tooltip: 'Increment',
//         child: const Icon(Icons.add),
//       ),
//     );
//   }
// }

// import 'package:flutter/material.dart';

// void main() {
//   runApp(const CallAVanApp());
// }

// class CallAVanApp extends StatelessWidget {
//   const CallAVanApp({super.key});

//   @override
//   Widget build(BuildContext context) {
//     return MaterialApp(
//       title: 'Call A Van',
//       debugShowCheckedModeBanner: false,
//       // Global Theme - Your "Tailwind Config" equivalent
//       theme: ThemeData(
//         primaryColor: const Color(0xFF0A4CBD), // Deep Blue
//         colorScheme: ColorScheme.fromSeed(
//           seedColor: const Color(0xFF003399),
//           secondary: const Color(0xFF00C853), // Success Green
//         ),
//         useMaterial3: true,
//       ),
//       home: const DriverHomeScreen(),
//     );
//   }
// }

// // We will move this to its own file later, but for now, let's build it here
// class DriverHomeScreen extends StatelessWidget {
//   const DriverHomeScreen({super.key});

//   @override
//   Widget build(BuildContext context) {
//     return Scaffold(
//       appBar: AppBar(
//         backgroundColor: const Color(0xFF003399),
//         leading: const Icon(Icons.location_on, color: Colors.white),
//         title: const Text('CallAVAN.live',
//           style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
//         actions: [
//           IconButton(onPressed: () {}, icon: const Icon(Icons.login, color: Colors.white)),
//           IconButton(onPressed: () {}, icon: const Icon(Icons.menu, color: Colors.white)),
//         ],
//       ),
//       body: Stack(
//         children: [
//           // This is where the Map will go later
//           Container(color: Colors.grey[200],
//             child: const Center(child: Text("Map View Placeholder"))),

//           // The Bottom Action Buttons
//           Align(
//             alignment: Alignment.bottomCenter,
//             child: Row(
//               children: [
//                 Expanded(
//                   child: MaterialButton(
//                     height: 60,
//                     color: const Color(0xFF003399),
//                     onPressed: () {},
//                     child: const Text('Become a Driver',
//                       style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
//                   ),
//                 ),
//                 Expanded(
//                   child: MaterialButton(
//                     height: 60,
//                     color: const Color(0xFF00C853),
//                     onPressed: () {},
//                     child: const Text('Go Live',
//                       style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
//                   ),
//                 ),
//               ],
//             ),
//           ),
//         ],
//       ),
//     );
//   }
// }

// import 'package:flutter/material.dart';

// void main() {
//   runApp(const CallAVanApp());
// }

// class CallAVanApp extends StatelessWidget {
//   const CallAVanApp({super.key});

//   @override
//   Widget build(BuildContext context) {
//     // This is the global theme for your app
//     const Color primaryBlue = Color(0xFF0A4CBD);

//     return MaterialApp(
//       title: 'Call A Van',
//       debugShowCheckedModeBanner: false,
//       theme: ThemeData(
//         primaryColor: primaryBlue,
//         colorScheme: ColorScheme.fromSeed(
//           seedColor: primaryBlue,
//           secondary: const Color(0xFF00C853), // Success Green
//         ),
//         useMaterial3: true,
//       ),
//       home: const DriverHomeScreen(),
//     );
//   }
// }

// class DriverHomeScreen extends StatelessWidget {
//   const DriverHomeScreen({super.key});

//   @override
//   Widget build(BuildContext context) {
//     const Color primaryBlue = Color(0xFF0A4CBD);

//     return Scaffold(
//       appBar: AppBar(
//         // Set the background to your specific blue
//         backgroundColor: primaryBlue,
//         elevation: 0,
//         // The left icon
//         // leading: const Icon(Icons.location_on, color: Colors.white),
//         // title now uses your LOGO image instead of just text
//         title: Image.asset(
//           'assets/logo.png',
//           height: 35, // Adjust this so it fits perfectly
//           fit: BoxFit.contain,
//         ),
//         actions: [
//           IconButton(onPressed: () {}, icon: const Icon(Icons.login, color: Colors.white)),
//           IconButton(onPressed: () {}, icon: const Icon(Icons.menu, color: Colors.white)),
//         ],
//       ),
//       body: Stack(
//         children: [
//           // Background - This will be the Google Map later
//           Container(
//             color: Colors.grey[200],
//             child: const Center(child: Text("Map View Placeholder")),
//           ),

//           // Bottom Buttons Row
//           Align(
//             alignment: Alignment.bottomCenter,
//             child: Row(
//               children: [
//                 Expanded(
//                   child: MaterialButton(
//                     height: 60,
//                     color: primaryBlue,
//                     onPressed: () {},
//                     child: const Text(
//                       'Become a Driver',
//                       style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
//                     ),
//                   ),
//                 ),
//                 Expanded(
//                   child: MaterialButton(
//                     height: 60,
//                     color: const Color(0xFF00C853),
//                     onPressed: () {},
//                     child: const Text(
//                       'Go Live',
//                       style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
//                     ),
//                   ),
//                 ),
//               ],
//             ),
//           ),
//         ],
//       ),
//     );
//   }
// }

import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'features/home/welcome_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: ".env");
  runApp(const CallAVanApp());
}

class CallAVanApp extends StatelessWidget {
  const CallAVanApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      debugShowCheckedModeBanner: false,
      home: WelcomeScreen(),
    );
  }
}
