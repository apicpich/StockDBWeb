import { Directive, Input } from '@angular/core';
import { NG_VALIDATORS, Validator, Validators, AbstractControl } from '@angular/forms';

@Directive({
  selector: 'input[max]',
  providers: [{provide: NG_VALIDATORS, useExisting: MaxValidator, multi: true}]
})
export class MaxValidator implements Validator {
  @Input() max: number;
  validate(control: AbstractControl): {[key: string]: any} {
    return Validators.max(this.max)(control)
  }
}

@Directive({
  selector: 'input[min]',
  providers: [{provide: NG_VALIDATORS, useExisting: MinValidator, multi: true}]
})
export class MinValidator implements Validator {
  @Input() min: number;
  validate(control: AbstractControl): { [key: string]: any } {
    return Validators.min(this.min)(control)
  }
}