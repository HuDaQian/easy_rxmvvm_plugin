import 'package:rxdart/rxdart.dart';
import 'package:flutter/widgets.dart';
import 'package:ff_annotation_route_library/ff_annotation_route_library.dart';

enum RouteLifecycleStateStatus {
  initial,

  onShow,

  onHide,

  onForeground,

  onBackground,

  disposed,
}

/// 页面生命周期状态
abstract class AppPageLifecycleState<T extends StatefulWidget>
    extends RouteLifecycleState<T> {
  /// App生命周期状态
  final appLifecycleState = PublishSubject<AppLifecycleState>();

  /// 页面生命周期状态
  final pageLifecycleState = PublishSubject<RouteLifecycleStateStatus>();

  @override
  void initState() {
    super.initState();
    pageLifecycleState.add(RouteLifecycleStateStatus.initial);
  }

  @override
  void onPageHide() {
    super.onPageHide();
    pageLifecycleState.add(RouteLifecycleStateStatus.onHide);
  }

  @override
  void onPageShow() {
    super.onPageShow();
    pageLifecycleState.add(RouteLifecycleStateStatus.onShow);
  }

  @override
  void onForeground() {
    super.onForeground();
    pageLifecycleState.add(RouteLifecycleStateStatus.onForeground);
  }

  @override
  void onBackground() {
    super.onBackground();
    pageLifecycleState.add(RouteLifecycleStateStatus.onBackground);
  }

  @override
  void dispose() {
    super.dispose();
    pageLifecycleState.add(RouteLifecycleStateStatus.disposed);
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    super.didChangeAppLifecycleState(state);
    appLifecycleState.add(state);
  }
}
