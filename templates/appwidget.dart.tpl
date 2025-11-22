import 'package:easy_rxmvvm/easy_rxmvvm.dart';
import 'package:flutter/material.dart';
$viewModelImport

class $nameWidget extends ViewModelConsumerStatefulWidget {
  const $nameWidget({super.key});

  @override
  ViewModelConsumerStateMixin<$nameWidget> createState() => _$nameWidgetState();
}

class _$nameWidgetState extends State<$nameWidget>
    with DisposeBagProvider,
         ViewModelConsumerStateMixin<$nameWidget>,
         SingleViewModelMixin<$viewModelClass, $nameWidget> {
  @override
  Widget build(BuildContext context) {
    return const SizedBox.shrink();
  }

  @override
  $viewModelClass viewModelCreate() => $createVMCall;
}