import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NodeDialog } from './node-dialog';

describe('NodeDialog', () => {
  let component: NodeDialog;
  let fixture: ComponentFixture<NodeDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NodeDialog],
    }).compileComponents();

    fixture = TestBed.createComponent(NodeDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
