import 'package:easy_rxmvvm/easy_rxmvvm.dart';
import 'package:flutter/material.dart';
import 'package:ff_annotation_route_library/ff_annotation_route_library.dart';
import '$nameRaw_viewmodel.dart';
$routeLifecycleImport


@FFRoute(
  name: '/$nameRaw',
  routeName: '$namePage',
  description: '$name page',
)
class $namePage extends ViewModelConsumerStatefulWidget {
    const $namePage({super.key});

    @override
    ViewModelConsumerStateMixin<$namePage> createState() => _$namePageState();
}

class _$namePageState extends $baseStateClass<$namePage>
with  DisposeBagProvider,
ViewModelConsumerStateMixin<$namePage>,
SingleViewModelMixin<$nameViewModel, $namePage> {
    @override
    Widget build(BuildContext context) {
        return const Scaffold(
            body: Center(
                child: Text('$name Page'),
            ),
        );
    }

    @override
    $nameViewModel viewModelCreate() => $nameViewModel();
}